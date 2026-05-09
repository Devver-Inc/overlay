import type { LogtoAuthConfig } from "../types";

const DEFAULT_LOGTO_ENDPOINT = "https://auth.devver.app/";
const DEFAULT_LOGTO_APP_ID = "5snm68ihnddmunh487ee3";
const ORGANIZATION_RESOURCE = "urn:logto:resource:organizations";
const ORGANIZATION_SCOPE = "urn:logto:scope:organizations";
const ORGANIZATION_ROLES_SCOPE = "urn:logto:scope:organization_roles";
const TOKEN_EXPIRY_MARGIN_SECONDS = 30;

const DEFAULT_SCOPES = [
  "openid",
  "offline_access",
  "profile",
  "email",
  "access:api",
  ORGANIZATION_SCOPE,
  ORGANIZATION_ROLES_SCOPE,
];

interface OpenIdConfig {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface StoredAccessToken {
  token: string;
  scope?: string;
  expiresAt: number;
}

interface StoredTokens {
  refreshToken?: string;
  idToken?: string;
  accessTokens: Record<string, StoredAccessToken>;
}

interface SignInSession {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  postRedirectUri: string;
}

export class LogtoAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LogtoAuthError";
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])];
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function getDefaultRedirectUri(): string {
  const { origin, pathname } = globalThis.location;
  return `${origin}${pathname}`;
}

function getCurrentUrl(): string {
  return globalThis.location.href;
}

function getTokenExpiry(token: string, fallbackSeconds = 3600): number {
  try {
    const [, payload] = token.split(".");
    if (!payload) throw new Error("Missing JWT payload");
    const claims = JSON.parse(base64UrlDecode(payload)) as { exp?: number };
    if (typeof claims.exp === "number") return claims.exp;
  } catch {
    // Fall back to the token response expiry below.
  }

  return Math.floor(Date.now() / 1000) + fallbackSeconds;
}

function getTokenStorageKey(appId: string): string {
  return `devver-logto:${appId}:tokens`;
}

function getSessionStorageKey(appId: string): string {
  return `devver-logto:${appId}:sign-in-session`;
}

function toStoredTokens(raw: string | null): StoredTokens {
  if (!raw) return { accessTokens: {} };

  try {
    const parsed = JSON.parse(raw) as Partial<StoredTokens>;
    return {
      refreshToken: parsed.refreshToken,
      idToken: parsed.idToken,
      accessTokens: parsed.accessTokens ?? {},
    };
  } catch {
    return { accessTokens: {} };
  }
}

function buildAccessTokenKey(resource?: string, organizationId?: string): string {
  return `${resource ?? ""}${organizationId ? `#${organizationId}` : ""}`;
}

export class LogtoAuthService {
  private configured = false;
  private config: Required<
    Pick<LogtoAuthConfig, "endpoint" | "appId" | "redirectUri">
  > &
    Omit<LogtoAuthConfig, "endpoint" | "appId" | "redirectUri"> = {
    endpoint: DEFAULT_LOGTO_ENDPOINT,
    appId: DEFAULT_LOGTO_APP_ID,
    redirectUri: "",
    postLogoutRedirectUri: "",
    apiResource: "",
    scopes: DEFAULT_SCOPES,
    resources: [],
  };

  private organizationId?: string;
  private oidcConfig: OpenIdConfig | null = null;

  public configure(
    config: LogtoAuthConfig | undefined,
    apiResource: string | undefined,
    organizationId: string | undefined,
  ): void {
    this.configured = Boolean(config);
    if (!this.configured) {
      this.organizationId = undefined;
      this.oidcConfig = null;
      return;
    }

    const endpoint = config?.endpoint ?? this.config.endpoint;
    const appId = config?.appId ?? this.config.appId;
    const resolvedApiResource = config?.apiResource ?? apiResource ?? "";

    this.config = {
      endpoint,
      appId,
      redirectUri:
        config?.redirectUri ?? (this.config.redirectUri || getDefaultRedirectUri()),
      postLogoutRedirectUri:
        config?.postLogoutRedirectUri ??
        (this.config.postLogoutRedirectUri || getDefaultRedirectUri()),
      apiResource: resolvedApiResource,
      scopes: unique([...(config?.scopes ?? []), ...DEFAULT_SCOPES]),
      resources: unique([
        ...(config?.resources ?? []),
        resolvedApiResource,
        ORGANIZATION_RESOURCE,
      ]),
    };
    this.organizationId = organizationId;
    this.oidcConfig = null;
  }

  public isConfigured(): boolean {
    return this.configured && Boolean(this.config.endpoint && this.config.appId);
  }

  public isAuthenticated(): boolean {
    return this.isConfigured() && Boolean(this.readTokens().refreshToken);
  }

  public getUserDisplayName(): string | null {
    const idToken = this.readTokens().idToken;
    if (!idToken) return null;

    try {
      const [, payload] = idToken.split(".");
      if (!payload) return null;
      const claims = JSON.parse(base64UrlDecode(payload)) as {
        name?: string;
        username?: string;
        email?: string;
      };
      return claims.name ?? claims.username ?? claims.email ?? null;
    } catch {
      return null;
    }
  }

  public async handleRedirectCallbackIfNeeded(): Promise<boolean> {
    if (!this.isConfigured()) return false;

    const url = new URL(getCurrentUrl());
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const session = this.readSignInSession();

    if (!code || !state || !session) return false;
    if (state !== session.state) {
      this.clearSignInSession();
      throw new LogtoAuthError("Invalid Logto callback state");
    }

    try {
      const oidc = await this.getOidcConfig();
      const tokenResponse = await this.requestToken(oidc.token_endpoint, {
        client_id: this.config.appId,
        code,
        code_verifier: session.codeVerifier,
        redirect_uri: session.redirectUri,
        grant_type: "authorization_code",
      });
      this.persistTokenResponse(tokenResponse);
      return true;
    } finally {
      this.clearSignInSession();
      history.replaceState(history.state, "", session.postRedirectUri);
    }
  }

  public async signIn(): Promise<void> {
    if (!this.isConfigured()) {
      throw new LogtoAuthError("Logto is not configured");
    }

    const oidc = await this.getOidcConfig();
    const codeVerifier = this.generateRandomString(64);
    const state = this.generateRandomString(32);
    const codeChallenge = await this.createCodeChallenge(codeVerifier);
    const redirectUri = this.config.redirectUri || getDefaultRedirectUri();
    const postRedirectUri = getCurrentUrl();

    this.writeSignInSession({
      state,
      codeVerifier,
      redirectUri,
      postRedirectUri,
    });

    const params = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
      response_type: "code",
      prompt: "consent",
      scope: this.config.scopes?.join(" ") ?? DEFAULT_SCOPES.join(" "),
    });

    for (const resource of this.config.resources ?? []) {
      params.append("resource", resource);
    }

    globalThis.location.assign(`${oidc.authorization_endpoint}?${params.toString()}`);
  }

  public async signOut(): Promise<void> {
    this.clearTokens();

    try {
      const oidc = await this.getOidcConfig();
      if (!oidc.end_session_endpoint) return;

      const params = new URLSearchParams({
        client_id: this.config.appId,
        post_logout_redirect_uri:
          this.config.postLogoutRedirectUri || getDefaultRedirectUri(),
      });
      globalThis.location.assign(`${oidc.end_session_endpoint}?${params.toString()}`);
    } catch {
      // Local token cleanup is enough for the overlay if Logto sign-out is unavailable.
    }
  }

  public async getAccessToken(
    resource = this.config.apiResource,
    organizationId = this.organizationId,
  ): Promise<string | undefined> {
    if (!this.isConfigured()) return undefined;

    const key = buildAccessTokenKey(resource, organizationId);
    const tokens = this.readTokens();
    const cached = tokens.accessTokens[key];
    const now = Math.floor(Date.now() / 1000);

    if (cached && cached.expiresAt - TOKEN_EXPIRY_MARGIN_SECONDS > now) {
      return cached.token;
    }

    if (!tokens.refreshToken) return undefined;

    try {
      const oidc = await this.getOidcConfig();
      const params: Record<string, string> = {
        client_id: this.config.appId,
        refresh_token: tokens.refreshToken,
        grant_type: "refresh_token",
      };
      if (resource) params.resource = resource;
      if (organizationId) params.organization_id = organizationId;

      const tokenResponse = await this.requestToken(oidc.token_endpoint, params);
      this.persistTokenResponse(tokenResponse, key);
      return tokenResponse.access_token;
    } catch (error) {
      console.warn("[DevverOverlay] Unable to refresh Logto token", error);
      this.clearTokens();
      return undefined;
    }
  }

  public clearTokens(): void {
    try {
      localStorage.removeItem(getTokenStorageKey(this.config.appId));
    } catch {
      // Storage may be unavailable in restricted browser contexts.
    }
  }

  private async getOidcConfig(): Promise<OpenIdConfig> {
    if (this.oidcConfig) return this.oidcConfig;

    const endpoint = trimTrailingSlash(this.config.endpoint);
    const response = await fetch(`${endpoint}/oidc/.well-known/openid-configuration`);
    if (!response.ok) {
      throw new LogtoAuthError(`Unable to load Logto discovery: ${response.status}`);
    }

    const config = (await response.json()) as OpenIdConfig;
    this.oidcConfig = config;
    return config;
  }

  private async requestToken(
    tokenEndpoint: string,
    params: Record<string, string>,
  ): Promise<TokenResponse> {
    const body = new URLSearchParams(params);
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = (await response.json()) as TokenResponse;
    if (!response.ok || data.error) {
      throw new LogtoAuthError(
        data.error_description ?? data.error ?? `Logto token error ${response.status}`,
      );
    }

    return data;
  }

  private persistTokenResponse(response: TokenResponse, accessTokenKey = ""): void {
    const tokens = this.readTokens();
    const expiresAt = getTokenExpiry(response.access_token, response.expires_in);

    tokens.accessTokens[accessTokenKey] = {
      token: response.access_token,
      scope: response.scope,
      expiresAt,
    };

    if (response.refresh_token) {
      tokens.refreshToken = response.refresh_token;
    }
    if (response.id_token) {
      tokens.idToken = response.id_token;
    }

    this.writeTokens(tokens);
  }

  private readTokens(): StoredTokens {
    try {
      return toStoredTokens(localStorage.getItem(getTokenStorageKey(this.config.appId)));
    } catch {
      return { accessTokens: {} };
    }
  }

  private writeTokens(tokens: StoredTokens): void {
    try {
      localStorage.setItem(getTokenStorageKey(this.config.appId), JSON.stringify(tokens));
    } catch {
      // Storage may be unavailable in restricted browser contexts.
    }
  }

  private readSignInSession(): SignInSession | null {
    try {
      const raw = sessionStorage.getItem(getSessionStorageKey(this.config.appId));
      return raw ? (JSON.parse(raw) as SignInSession) : null;
    } catch {
      return null;
    }
  }

  private writeSignInSession(session: SignInSession): void {
    try {
      sessionStorage.setItem(
        getSessionStorageKey(this.config.appId),
        JSON.stringify(session),
      );
    } catch {
      throw new LogtoAuthError("Unable to persist Logto sign-in session");
    }
  }

  private clearSignInSession(): void {
    try {
      sessionStorage.removeItem(getSessionStorageKey(this.config.appId));
    } catch {
      // Ignore storage cleanup failures.
    }
  }

  private generateRandomString(byteLength: number): string {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return base64UrlEncode(bytes);
  }

  private async createCodeChallenge(codeVerifier: string): Promise<string> {
    const bytes = new TextEncoder().encode(codeVerifier);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return base64UrlEncode(new Uint8Array(digest));
  }
}
