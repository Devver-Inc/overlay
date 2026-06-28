import type { LogtoAuthConfig } from "../types";

const TOKEN_EXPIRY_MARGIN_SECONDS = 30;
const POPUP_WIDTH = 460;
const POPUP_HEIGHT = 640;

interface StoredAccessToken {
  token: string;
  expiresAt: number;
}

interface StoredTokens {
  accessTokens: Record<string, StoredAccessToken>;
  userName?: string;
  userEmail?: string;
}

interface OverlayAuthMessage {
  type: "devver-overlay-auth";
  nonce: string;
  accessToken?: string;
  expiresAt?: number;
  userName?: string;
  userEmail?: string;
  error?: string;
}

export class LogtoAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LogtoAuthError";
  }
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

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])];
}

function buildAccessTokenKey(resource?: string, organizationId?: string): string {
  return `${resource ?? ""}${organizationId ? `#${organizationId}` : ""}`;
}

function getTokenStorageKey(appId: string): string {
  return `devver-logto:${appId}:tokens`;
}

function toStoredTokens(raw: string | null): StoredTokens {
  if (!raw) return { accessTokens: {} };

  try {
    const parsed = JSON.parse(raw) as Partial<StoredTokens>;
    return {
      accessTokens: parsed.accessTokens ?? {},
      userName: parsed.userName,
      userEmail: parsed.userEmail,
    };
  } catch {
    return { accessTokens: {} };
  }
}

function isEmailLike(value: string | undefined): value is string {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

function getTokenEmail(token: string): string | undefined {
  try {
    const [, payload] = token.split(".");
    if (!payload) throw new Error("Missing JWT payload");
    const claims = JSON.parse(base64UrlDecode(payload)) as {
      email?: string;
      primaryEmail?: string;
    };
    const email = claims.email ?? claims.primaryEmail;
    return isEmailLike(email) ? email : undefined;
  } catch {
    return undefined;
  }
}

function getTokenExpiry(token: string, fallbackSeconds = 3600): number {
  try {
    const [, payload] = token.split(".");
    if (!payload) throw new Error("Missing JWT payload");
    const claims = JSON.parse(base64UrlDecode(payload)) as { exp?: number };
    if (typeof claims.exp === "number") return claims.exp;
  } catch {
    // Fall back to the relay-provided expiry below.
  }

  return Math.floor(Date.now() / 1000) + fallbackSeconds;
}

function getPopupFeatures(): string {
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - POPUP_WIDTH) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2));

  return [
    `width=${POPUP_WIDTH}`,
    `height=${POPUP_HEIGHT}`,
    `left=${left}`,
    `top=${top}`,
    "popup=yes",
    "resizable=yes",
    "scrollbars=yes",
  ].join(",");
}

function getOrigin(url: string): string {
  return new URL(url).origin;
}

export class LogtoAuthService {
  private configured = false;
  private config: LogtoAuthConfig & {
    appId: string;
    authPortalUrl: string;
    apiResource: string;
    resources: string[];
  } = {
    appId: "devver-overlay",
    authPortalUrl: "",
    apiResource: "",
    resources: [],
  };

  private organizationId?: string;
  private signInPromise: Promise<void> | null = null;

  public configure(
    config: LogtoAuthConfig | undefined,
    apiResource: string | undefined,
    organizationId: string | undefined,
  ): void {
    this.configured = Boolean(config?.authPortalUrl);
    if (!this.configured) {
      this.organizationId = undefined;
      return;
    }

    const resolvedApiResource = config?.apiResource ?? apiResource ?? "";
    this.config = {
      ...config,
      appId: config?.appId ?? "devver-overlay",
      authPortalUrl: config?.authPortalUrl ?? "",
      apiResource: resolvedApiResource,
      resources: unique([...(config?.resources ?? []), resolvedApiResource]),
    };
    this.organizationId = organizationId;
  }

  public isConfigured(): boolean {
    return this.configured && Boolean(this.config.authPortalUrl);
  }

  public isAuthenticated(): boolean {
    if (!this.isConfigured()) return false;

    const key = buildAccessTokenKey(this.config.apiResource, this.organizationId);
    const cached = this.readTokens().accessTokens[key];
    const now = Math.floor(Date.now() / 1000);

    return Boolean(cached && cached.expiresAt - TOKEN_EXPIRY_MARGIN_SECONDS > now);
  }

  public getUserDisplayName(): string | null {
    return this.readTokens().userName ?? null;
  }

  public getUserEmail(): string | null {
    if (!this.isAuthenticated()) return null;

    const tokens = this.readTokens();
    if (isEmailLike(tokens.userEmail)) return tokens.userEmail;

    const key = buildAccessTokenKey(this.config.apiResource, this.organizationId);
    const tokenEmail = tokens.accessTokens[key]
      ? getTokenEmail(tokens.accessTokens[key].token)
      : undefined;

    return tokenEmail ?? null;
  }

  public async handleRedirectCallbackIfNeeded(): Promise<boolean> {
    return false;
  }

  public async signIn(): Promise<void> {
    if (!this.isConfigured()) {
      throw new LogtoAuthError("Logto auth portal is not configured");
    }

    if (this.signInPromise) return this.signInPromise;

    this.signInPromise = this.openAuthPopup().finally(() => {
      this.signInPromise = null;
    });

    return this.signInPromise;
  }

  public async signOut(): Promise<void> {
    this.clearTokens();
  }

  public async getAccessToken(
    resource = this.config.apiResource,
    organizationId = this.organizationId,
  ): Promise<string | undefined> {
    if (!this.isConfigured()) return undefined;

    const key = buildAccessTokenKey(resource, organizationId);
    const cached = this.readTokens().accessTokens[key];
    const now = Math.floor(Date.now() / 1000);

    if (cached && cached.expiresAt - TOKEN_EXPIRY_MARGIN_SECONDS > now) {
      return cached.token;
    }

    return undefined;
  }

  public clearTokens(): void {
    try {
      localStorage.removeItem(getTokenStorageKey(this.config.appId));
    } catch {
      // Storage may be unavailable in restricted browser contexts.
    }
  }

  private openAuthPopup(): Promise<void> {
    const nonce = this.generateRandomString(32);
    const authUrl = this.buildAuthUrl(nonce);
    const authOrigin = getOrigin(authUrl);

    return new Promise((resolve, reject) => {
      let timeoutId = 0;
      let intervalId = 0;
      let popup: Window | null = null;

      const cleanup = (): void => {
        window.clearTimeout(timeoutId);
        window.clearInterval(intervalId);
        window.removeEventListener("message", handleMessage);
      };

      const handleMessage = (event: MessageEvent<unknown>): void => {
        if (event.origin !== authOrigin) return;

        const data = event.data as Partial<OverlayAuthMessage>;
        if (data.type !== "devver-overlay-auth" || data.nonce !== nonce) return;

        cleanup();
        popup?.close();

        if (data.error || !data.accessToken) {
          reject(new LogtoAuthError(data.error ?? "Devver sign-in failed"));
          return;
        }

        this.persistAccessToken(
          data.accessToken,
          data.expiresAt,
          data.userName,
          data.userEmail,
        );
        resolve();
      };

      window.addEventListener("message", handleMessage);

      popup = window.open(authUrl, "devver-overlay-auth", getPopupFeatures());
      if (!popup) {
        cleanup();
        reject(new LogtoAuthError("The browser blocked the Devver sign-in popup"));
        return;
      }

      popup.focus();
      timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new LogtoAuthError("Devver sign-in timed out"));
      }, 120_000);
      intervalId = window.setInterval(() => {
        if (popup.closed) {
          cleanup();
          reject(new LogtoAuthError("Devver sign-in was closed"));
        }
      }, 500);
    });
  }

  private buildAuthUrl(nonce: string): string {
    const authUrl = new URL(this.config.authPortalUrl);
    authUrl.searchParams.set("nonce", nonce);
    authUrl.searchParams.set("targetOrigin", window.location.origin);

    if (this.organizationId) {
      authUrl.searchParams.set("organizationId", this.organizationId);
    }
    if (this.config.apiResource) {
      authUrl.searchParams.set("resource", this.config.apiResource);
    }

    return authUrl.toString();
  }

  private persistAccessToken(
    accessToken: string,
    expiresAt: number | undefined,
    userName: string | undefined,
    userEmail: string | undefined,
  ): void {
    const key = buildAccessTokenKey(this.config.apiResource, this.organizationId);
    const tokens = this.readTokens();
    const resolvedEmail =
      (isEmailLike(userEmail) ? userEmail : undefined) ??
      getTokenEmail(accessToken) ??
      (isEmailLike(userName) ? userName : undefined);

    tokens.accessTokens[key] = {
      token: accessToken,
      expiresAt: expiresAt ?? getTokenExpiry(accessToken),
    };

    if (userName) {
      tokens.userName = userName;
    }
    if (resolvedEmail) {
      tokens.userEmail = resolvedEmail;
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

  private generateRandomString(byteLength: number): string {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return base64UrlEncode(bytes);
  }
}
