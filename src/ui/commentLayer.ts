/**
 * Comment Layer - Renders comment pins on the page
 */

import type { CommentItem } from "../types";

type PinClickHandler = (comment: CommentItem) => void;

export interface PinRenderItem {
  comment: CommentItem;
  x: number;
  y: number;
  index: number;
}

/**
 * CommentLayer manages the rendering of comment pins
 */
export class CommentLayer {
  private readonly layer: HTMLElement;
  private previewPin: HTMLElement | null = null;

  constructor() {
    this.layer = document.createElement("div");
    this.layer.className = "devver-comment-layer";
    this.layer.dataset.devverCommentUi = "true";
    document.body.appendChild(this.layer);
  }

  /**
   * Render all comment pins
   */
  public render(items: PinRenderItem[], onPinClick: PinClickHandler): void {
    // Keep the preview pin if it exists
    const existingPreview = this.previewPin;
    
    this.layer.innerHTML = "";
    items.forEach((item) => {
      const pin = this.createPin(item, onPinClick);
      this.layer.appendChild(pin);
    });

    // Re-add preview pin if it exists
    if (existingPreview && this.previewPin) {
      this.layer.appendChild(existingPreview);
    }
  }

  /**
   * Show a preview pin at the specified position
   */
  public showPreviewPin(x: number, y: number, index: number): void {
    this.removePreviewPin();
    
    this.previewPin = document.createElement("button");
    this.previewPin.className = "devver-comment-pin devver-comment-pin-preview";
    this.previewPin.dataset.devverCommentUi = "true";
    this.previewPin.style.left = `${x}px`;
    this.previewPin.style.top = `${y}px`;
    this.previewPin.textContent = String(index);
    
    this.layer.appendChild(this.previewPin);
  }

  /**
   * Remove the preview pin
   */
  public removePreviewPin(): void {
    this.previewPin?.remove();
    this.previewPin = null;
  }

  /**
   * Create a single pin element
   */
  private createPin(item: PinRenderItem, onPinClick: PinClickHandler): HTMLElement {
    const pin = document.createElement("button");
    pin.className = "devver-comment-pin";
    pin.dataset.devverCommentUi = "true";
    pin.style.left = `${item.x}px`;
    pin.style.top = `${item.y}px`;
    pin.title = item.comment.text;
    pin.textContent = String(item.index);
    pin.setAttribute("aria-label", `Commentaire ${item.index}: ${item.comment.text.slice(0, 50)}`);

    pin.addEventListener("click", (e) => {
      e.stopPropagation();
      onPinClick(item.comment);
    });

    return pin;
  }
}
