/**
 * Devver Overlay - Figma-like commenting widget
 *
 * @packageDocumentation
 */

import type {
  CommentApiConfig,
  DevverOverlayAPI,
  DevverScriptConfig,
  OverlayOptions,
} from "./types";
import { DevverOverlay } from "./core/DevverOverlay";
import { globalScope } from "./core/globalScope";

const DEVVER_API_BASE_URL = "https://app.devver.app/api/v1";
const DEVVER_LOGTO_ENDPOINT = "https://auth.devver.app/";
const DEVVER_LOGTO_APP_ID = "5snm68ihnddmunh487ee3";

function getDefaultAuthPortalUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    if (
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.port === "3000"
    ) {
      return `${url.protocol}//${url.hostname}:5173/overlay-auth`;
    }

    return `${url.origin}/overlay-auth`;
  } catch {
    return "https://app.devver.app/overlay-auth";
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

/**
 * Default overlay instance
 * Created automatically when the script loads
 */
const devverOverlay = new DevverOverlay();

// ============================================
// GLOBAL API
// ============================================

/**
 * Public API exposed on the global scope
 * Accessible via `window.DevverOverlay` or `DevverOverlay`
 */
const api: DevverOverlayAPI = {
  /**
   * Show a modal overlay
   * @param options - Modal configuration options
   */
  show: (options?: OverlayOptions) => devverOverlay.show(options),

  /**
   * Close the current modal
   */
  close: () => devverOverlay.close(),

  /**
   * Check if a modal is currently open
   */
  isOpen: () => devverOverlay.isOpen(),

  /**
   * Enable comment mode
   * @param config - Optional API configuration for comments
   */
  enableComments: (config?: CommentApiConfig) => devverOverlay.enableComments(config),

  /**
   * Disable comment mode
   */
  disableComments: () => devverOverlay.disableComments(),

  /**
   * Configure the comment service
   * @param config - API configuration for comments
   */
  configureComments: (config: CommentApiConfig) => devverOverlay.configureComments(config),

  /**
   * Get all comments for the current page
   */
  listComments: () => devverOverlay.listComments(),

  /**
   * Set the author name for new comments
   * @param name - The author name to use
   */
  setAuthorName: (name: string) => devverOverlay.setAuthorName(name),

  /**
   * Start Devver Logto sign-in.
   */
  signIn: () => devverOverlay.signIn(),

  /**
   * Clear Devver overlay session and sign out from Logto when available.
   */
  signOut: () => devverOverlay.signOut(),

  /**
   * Check if the overlay has a Logto refresh token.
   */
  isAuthenticated: () => devverOverlay.isAuthenticated(),
};

// Expose on global scope
globalScope.DevverOverlay = api;

// On a Devver preview the deploy agent serves the context at /__devver/context;
// window.__DEVVER__ still works for manual embeds.
async function loadPreviewContext(): Promise<DevverScriptConfig | undefined> {
  const response = await fetch("/__devver/context").catch(() => undefined);
  if (!response?.ok) return undefined;
  const { projectId, organizationId, repo, ref } = await response.json();
  return { projectId, organizationId, repo, branch: ref };
}

async function autoConfigure(): Promise<void> {
  const injected = (globalScope as unknown as { __DEVVER__?: DevverScriptConfig }).__DEVVER__;
  const context = injected?.projectId ? injected : await loadPreviewContext();
  if (!context?.projectId) return;

  const baseUrl = context.apiBaseUrl ?? DEVVER_API_BASE_URL;
  const overlayAccessControl =
    context.overlayAccessControl ??
    (await fetch(`${baseUrl}/projects/${context.projectId}/overlay-access`)
      .then((response) => (response.ok ? response.json() : undefined))
      .catch(() => undefined));

  devverOverlay.configureComments({
    mode: "api",
    baseUrl,
    projectId: context.projectId,
    organizationId: context.organizationId,
    repo: context.repo,
    branch: context.branch,
    logto: {
      endpoint: DEVVER_LOGTO_ENDPOINT,
      appId: DEVVER_LOGTO_APP_ID,
      apiResource: baseUrl,
      authPortalUrl: getDefaultAuthPortalUrl(baseUrl),
      ...context.logto,
    },
    overlayAccessControl,
  });
}

void autoConfigure();

// ============================================
// TYPE DECLARATIONS
// ============================================

declare global {
  interface Window {
    DevverOverlay: DevverOverlayAPI;
  }
  // eslint-disable-next-line no-var
  var DevverOverlay: DevverOverlayAPI;
}

// ============================================
// EXPORTS
// ============================================

export default devverOverlay;
export { DevverOverlay } from "./core/DevverOverlay";
export type {
  DevverConfig,
  DevverScriptConfig,
  OverlayOptions,
  LogtoAuthConfig,
  CommentApiConfig,
  CommentItem,
  DevverOverlayAPI,
} from "./types";
