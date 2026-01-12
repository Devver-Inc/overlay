/**
 * Modal component for displaying overlay content
 */

import type { OverlayOptions } from "../types";
import { calculateModalPosition } from "../utils/position";

/**
 * Modal UI component
 * Handles creation, display, and removal of modal overlays
 */
export class Modal {
  private overlay: HTMLElement | null = null;
  private options: OverlayOptions = {};

  /**
   * Show the modal with given options
   */
  public show(options: OverlayOptions = {}): void {
    this.options = {
      title: options.title || "",
      content: options.content || "",
      closeOnClickOutside: options.closeOnClickOutside ?? true,
      showCloseButton: options.showCloseButton ?? true,
      onClose: options.onClose,
      className: options.className || "",
      anchorX: options.anchorX,
      anchorY: options.anchorY,
      showBackdrop: options.showBackdrop ?? true,
    };

    // Close existing modal if open
    if (this.overlay) {
      this.closeImmediate();
    }

    this.createOverlay();
  }

  /**
   * Close the modal with animation
   */
  public close(): void {
    if (!this.overlay) return;

    const overlayToRemove = this.overlay;
    overlayToRemove.classList.remove("devver-overlay-active");

    setTimeout(() => {
      overlayToRemove.remove();
      this.overlay = null;
      this.options.onClose?.();
    }, 300);
  }

  /**
   * Close immediately without animation
   */
  private closeImmediate(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  /**
   * Check if modal is currently open
   */
  public isOpen(): boolean {
    return this.overlay !== null;
  }

  /**
   * Create the overlay DOM structure
   */
  private createOverlay(): void {
    this.overlay = document.createElement("div");
    this.overlay.className = "devver-overlay";
    this.overlay.dataset.devverCommentUi = "true";

    if (this.options.className) {
      this.overlay.classList.add(this.options.className);
    }

    // Backdrop (optional)
    if (this.options.showBackdrop) {
      const backdrop = this.createBackdrop();
      this.overlay.appendChild(backdrop);
    } else if (this.options.closeOnClickOutside) {
      // Invisible click catcher for close on outside click
      const clickCatcher = document.createElement("div");
      clickCatcher.style.cssText = "position:absolute;inset:0;";
      clickCatcher.addEventListener("click", () => this.close());
      this.overlay.appendChild(clickCatcher);
    }

    // Modal container
    const modal = this.createModal();
    this.overlay.appendChild(modal);
    document.body.appendChild(this.overlay);

    // Trigger animation
    requestAnimationFrame(() => {
      this.overlay?.classList.add("devver-overlay-active");
    });
  }

  /**
   * Create the backdrop element
   */
  private createBackdrop(): HTMLElement {
    const backdrop = document.createElement("div");
    backdrop.className = "devver-overlay-backdrop";

    if (this.options.closeOnClickOutside) {
      backdrop.addEventListener("click", () => this.close());
    }

    return backdrop;
  }

  /**
   * Create the modal element
   */
  private createModal(): HTMLElement {
    const modal = document.createElement("div");
    modal.className = "devver-overlay-modal";
    modal.addEventListener("click", (e) => e.stopPropagation());

    // Position near anchor if provided
    this.applyAnchorPosition(modal);

    // Header
    if (this.options.title || this.options.showCloseButton) {
      modal.appendChild(this.createHeader());
    }

    // Body
    if (this.options.content) {
      modal.appendChild(this.createBody());
    }

    return modal;
  }

  /**
   * Apply anchor-based positioning to modal
   */
  private applyAnchorPosition(modal: HTMLElement): void {
    if (this.options.anchorX === undefined || this.options.anchorY === undefined) {
      return;
    }

    modal.classList.add("devver-overlay-modal-anchored");

    const position = calculateModalPosition({
      anchorX: this.options.anchorX,
      anchorY: this.options.anchorY,
    });

    modal.style.left = `${position.left}px`;
    modal.style.top = `${position.top}px`;
  }

  /**
   * Create the modal header
   */
  private createHeader(): HTMLElement {
    const header = document.createElement("div");
    header.className = "devver-overlay-header";

    if (this.options.title) {
      const title = document.createElement("h2");
      title.className = "devver-overlay-title";
      title.textContent = this.options.title;
      header.appendChild(title);
    }

    if (this.options.showCloseButton) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "devver-overlay-close";
      closeBtn.innerHTML = "&times;";
      closeBtn.ariaLabel = "Fermer";
      closeBtn.addEventListener("click", () => this.close());
      header.appendChild(closeBtn);
    }

    return header;
  }

  /**
   * Create the modal body
   */
  private createBody(): HTMLElement {
    const body = document.createElement("div");
    body.className = "devver-overlay-body";

    if (typeof this.options.content === "string") {
      body.innerHTML = this.options.content;
    }

    return body;
  }
}
