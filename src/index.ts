/**
 * Devver Overlay - Figma-like commenting widget
 *
 * @packageDocumentation
 */

import type {
  CommentApiConfig,
  DevverOverlayAPI,
  OverlayOptions,
} from "./types";
import { DevverOverlay } from "./core/DevverOverlay";
import { globalScope } from "./core/globalScope";

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
};

// Expose on global scope
globalScope.DevverOverlay = api;

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
  OverlayOptions,
  CommentApiConfig,
  CommentItem,
  DevverOverlayAPI,
} from "./types";
