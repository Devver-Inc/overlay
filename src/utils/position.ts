/**
 * Position calculation utilities for UI elements
 */

import { getViewportSize } from "../core/globalScope";

export interface AnchorPosition {
  anchorX: number;
  anchorY: number;
}

export interface ModalPosition {
  left: number;
  top: number;
}

export interface ModalDimensions {
  width: number;
  height: number;
}

const DEFAULT_MODAL_DIMENSIONS: ModalDimensions = {
  width: 320,
  height: 200,
};

const MARGIN = 20;

/**
 * Calculate optimal modal position relative to an anchor point
 * Prefers positioning to the right of the anchor, falls back to left if needed
 * Ensures modal stays within viewport bounds
 */
export function calculateModalPosition(
  anchor: AnchorPosition,
  dimensions: ModalDimensions = DEFAULT_MODAL_DIMENSIONS
): ModalPosition {
  const viewport = getViewportSize();
  const { width: modalWidth, height: modalHeight } = dimensions;

  // Calculate horizontal position: prefer right of anchor, fallback left
  let left = anchor.anchorX + MARGIN;
  if (left + modalWidth > viewport.width - MARGIN) {
    left = anchor.anchorX - modalWidth - MARGIN;
  }
  left = Math.max(MARGIN, Math.min(left, viewport.width - modalWidth - MARGIN));

  // Calculate vertical position: align with anchor, keep in viewport
  let top = anchor.anchorY - MARGIN;
  if (top + modalHeight > viewport.height - MARGIN) {
    top = viewport.height - modalHeight - MARGIN;
  }
  top = Math.max(MARGIN, top);

  return { left, top };
}

/**
 * Check if a point is within the viewport with some margin
 */
export function isInViewport(
  x: number,
  y: number,
  margin: number = 50
): boolean {
  const viewport = getViewportSize();
  return (
    x >= margin &&
    x <= viewport.width - margin &&
    y >= margin &&
    y <= viewport.height - margin
  );
}

/**
 * Calculate scroll target to bring a point into view
 * Centers the point roughly in the viewport
 */
export function calculateScrollTarget(
  absoluteX: number,
  absoluteY: number
): { x: number; y: number } {
  const viewport = getViewportSize();
  return {
    x: Math.max(absoluteX - viewport.width / 3, 0),
    y: Math.max(absoluteY - viewport.height / 3, 0),
  };
}
