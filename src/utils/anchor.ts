/**
 * Anchor utilities for comment positioning
 * Handles robust anchoring of comments to DOM elements
 */

import { getScrollPosition } from "../core/globalScope";
import { isCommentUi } from "./sanitize";

/** Safe data attributes to use for element identification */
const SAFE_ATTRS = ["data-testid", "data-id", "data-name"];

/**
 * Escape a string for use in CSS selectors
 */
function escapeCss(value: string): string {
  if (typeof CSS !== "undefined" && CSS.escape) {
    return CSS.escape(value);
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

/**
 * Clamp a value between 0 and 1, or return undefined if invalid
 */
export function clamp01(value: number | undefined): number | undefined {
  if (value === undefined || Number.isNaN(value)) return undefined;
  return Math.min(1, Math.max(0, value));
}

/**
 * Generate a CSS selector for an element
 * Prioritizes: id > data attributes > structural path
 */
export function generateSelector(element: HTMLElement): string | undefined {
  // Try ID first (most reliable)
  if (element.id) {
    return `#${escapeCss(element.id)}`;
  }

  // Try safe data attributes
  for (const attr of SAFE_ATTRS) {
    const val = element.getAttribute(attr);
    if (val) {
      return `[${attr}="${escapeCss(val)}"]`;
    }
  }

  // Fallback to structural path (less reliable but works)
  const parts: string[] = [];
  let el: HTMLElement | null = element;
  let depth = 0;

  while (el && depth < 4) {
    const tag = el.tagName.toLowerCase();
    const parent: HTMLElement | null = el.parentElement;
    let selector = tag;

    if (parent) {
      const siblings = Array.from(parent.children).filter((sib) => {
        return sib instanceof HTMLElement && el !== null && sib.tagName === el.tagName;
      });
      if (siblings.length > 1 && parent instanceof HTMLElement) {
        const index = siblings.indexOf(el) + 1;
        selector = `${tag}:nth-of-type(${index})`;
      }
    }

    parts.unshift(selector);
    el = parent;
    depth += 1;
  }

  return parts.join(" > ") || undefined;
}

/**
 * Anchor data for a comment
 * Contains all information needed to position a comment relative to the page
 */
export interface AnchorData {
  /** Absolute page X coordinate at time of creation */
  pageX: number;
  /** Absolute page Y coordinate at time of creation */
  pageY: number;
  /** Normalized X position (0-1) relative to document width */
  normX?: number;
  /** Normalized Y position (0-1) relative to document height */
  normY?: number;
  /** CSS selector of the anchor element */
  anchorSelector?: string;
  /** Relative X offset within the anchor element (0-1) */
  anchorOffsetX?: number;
  /** Relative Y offset within the anchor element (0-1) */
  anchorOffsetY?: number;
}

/**
 * Build anchor data from a mouse event
 * Captures all positioning information for robust comment placement
 */
export function buildAnchorData(event: MouseEvent): AnchorData {
  const pageX = event.pageX;
  const pageY = event.pageY;
  const doc = document.documentElement;

  // Normalized coordinates (fallback positioning)
  const normX = doc.scrollWidth ? pageX / doc.scrollWidth : undefined;
  const normY = doc.scrollHeight ? pageY / doc.scrollHeight : undefined;

  // Try to find anchor element at click position
  const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;

  if (!target || isCommentUi(target)) {
    return { pageX, pageY, normX, normY };
  }

  // Generate selector and calculate relative offsets
  const selector = generateSelector(target);
  const rect = target.getBoundingClientRect();
  const offsetX = clamp01(rect.width ? (event.clientX - rect.left) / rect.width : undefined);
  const offsetY = clamp01(rect.height ? (event.clientY - rect.top) / rect.height : undefined);

  return {
    pageX,
    pageY,
    normX,
    normY,
    anchorSelector: selector,
    anchorOffsetX: offsetX,
    anchorOffsetY: offsetY,
  };
}

/**
 * Interface for objects with anchor data (like CommentItem)
 */
export interface Anchorable {
  x: number;
  y: number;
  normX?: number;
  normY?: number;
  anchorSelector?: string;
  anchorOffsetX?: number;
  anchorOffsetY?: number;
}

/**
 * Resolve absolute X position for an anchored item
 * Priority: anchor element > normalized position > stored position
 */
export function resolveAbsoluteX(item: Anchorable, docWidth: number): number {
  const scroll = getScrollPosition();

  // Try anchor element first (most accurate)
  if (item.anchorSelector && item.anchorOffsetX !== undefined) {
    const el = document.querySelector(item.anchorSelector) as HTMLElement | null;
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width) {
        return rect.left + rect.width * item.anchorOffsetX + scroll.x;
      }
    }
  }

  // Fallback to normalized position
  if (item.normX !== undefined && docWidth) {
    return item.normX * docWidth;
  }

  // Last resort: stored position
  return item.x;
}

/**
 * Resolve absolute Y position for an anchored item
 * Priority: anchor element > normalized position > stored position
 */
export function resolveAbsoluteY(item: Anchorable, docHeight: number): number {
  const scroll = getScrollPosition();

  // Try anchor element first (most accurate)
  if (item.anchorSelector && item.anchorOffsetY !== undefined) {
    const el = document.querySelector(item.anchorSelector) as HTMLElement | null;
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.height) {
        return rect.top + rect.height * item.anchorOffsetY + scroll.y;
      }
    }
  }

  // Fallback to normalized position
  if (item.normY !== undefined && docHeight) {
    return item.normY * docHeight;
  }

  // Last resort: stored position
  return item.y;
}

/**
 * Get absolute position for an anchored item
 */
export function resolveAbsolutePosition(item: Anchorable): { x: number; y: number } {
  const doc = document.documentElement;
  return {
    x: resolveAbsoluteX(item, doc.scrollWidth),
    y: resolveAbsoluteY(item, doc.scrollHeight),
  };
}
