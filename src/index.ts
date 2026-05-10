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

// Auto-configure from injected window.__DEVVER__ script tag
const __DEVVER__ = (globalScope as unknown as { __DEVVER__?: DevverScriptConfig }).__DEVVER__;
if (__DEVVER__?.projectId) {
  const baseUrl = __DEVVER__.apiBaseUrl ?? DEVVER_API_BASE_URL;
  devverOverlay.configureComments({
    mode: "api",
    baseUrl,
    projectId: __DEVVER__.projectId,
    organizationId: __DEVVER__.organizationId,
    repo: __DEVVER__.repo,
    branch: __DEVVER__.branch,
    logto: {
      endpoint: DEVVER_LOGTO_ENDPOINT,
      appId: DEVVER_LOGTO_APP_ID,
      apiResource: baseUrl,
      authPortalUrl: getDefaultAuthPortalUrl(baseUrl),
      ...__DEVVER__.logto,
    },
    overlayAccessControl: __DEVVER__.overlayAccessControl,
  });
}

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
