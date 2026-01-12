/**
 * Global scope utilities
 * Provides a safe reference to the global object across different environments
 * (browser, Node.js, Web Workers, etc.)
 */

type GlobalScope = typeof globalThis & {
  scrollX?: number;
  scrollY?: number;
  innerWidth?: number;
  innerHeight?: number;
  scrollTo?: (options: ScrollToOptions) => void;
  addEventListener?: (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions
  ) => void;
  removeEventListener?: (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: EventListenerOptions
  ) => void;
  location?: Location;
};

/**
 * Safe global scope reference that works in all JavaScript environments
 */
export const globalScope: GlobalScope =
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
      ? (window as unknown as GlobalScope)
      : typeof self !== "undefined"
        ? (self as unknown as GlobalScope)
        : ({} as GlobalScope);

/**
 * Get current scroll position
 */
export function getScrollPosition(): { x: number; y: number } {
  return {
    x: globalScope.scrollX ?? 0,
    y: globalScope.scrollY ?? 0,
  };
}

/**
 * Get viewport dimensions
 */
export function getViewportSize(): { width: number; height: number } {
  return {
    width: globalScope.innerWidth ?? 800,
    height: globalScope.innerHeight ?? 600,
  };
}

/**
 * Get current page URL without hash
 */
export function getPageUrl(): string {
  return (globalScope.location?.href.split("#")[0] as string | undefined) ?? "";
}

/**
 * Smooth scroll to a position
 */
export function scrollTo(x: number, y: number): void {
  try {
    globalScope.scrollTo?.({ top: y, left: x, behavior: "smooth" });
  } catch {
    // Ignore scroll failures in restricted environments
  }
}
