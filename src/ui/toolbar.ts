/**
 * Toolbar - Bottom-centered floating toolbar (Astro-inspired)
 */

import type { ToolbarPosition } from "./settingsPanel";

export interface ToolbarButton {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
  badge?: number;
}

export interface ToolbarOptions {
  buttons: ToolbarButton[];
}

/**
 * Floating toolbar component
 */
export class Toolbar {
  private toolbar: HTMLElement | null = null;
  private buttons: Map<string, HTMLElement> = new Map();
  private position: ToolbarPosition = "bottom-center";

  constructor() {
    this.create();
  }

  /**
   * Create the toolbar element
   */
  private create(): void {
    this.toolbar = document.createElement("div");
    this.toolbar.className = "devver-toolbar";
    this.toolbar.dataset.devverCommentUi = "true";
    document.body.appendChild(this.toolbar);
  }

  /**
   * Set the toolbar position
   */
  public setPosition(position: ToolbarPosition): void {
    if (!this.toolbar) return;
    
    this.position = position;
    
    // Remove all position classes
    this.toolbar.classList.remove(
      "devver-toolbar-bottom-left",
      "devver-toolbar-bottom-center",
      "devver-toolbar-bottom-right"
    );
    
    // Add the new position class
    this.toolbar.classList.add(`devver-toolbar-${position}`);
  }

  /**
   * Get current toolbar position
   */
  public getPosition(): ToolbarPosition {
    return this.position;
  }

  /**
   * Set toolbar buttons
   */
  public setButtons(buttons: ToolbarButton[]): void {
    if (!this.toolbar) return;

    this.toolbar.innerHTML = "";
    this.buttons.clear();

    buttons.forEach((btn, index) => {
      // Add divider between button groups
      if (index > 0) {
        const divider = document.createElement("div");
        divider.className = "devver-toolbar-divider";
        this.toolbar?.appendChild(divider);
      }

      const button = this.createButton(btn);
      this.buttons.set(btn.id, button);
      this.toolbar?.appendChild(button);
    });
  }

  /**
   * Create a single button
   */
  private createButton(config: ToolbarButton): HTMLElement {
    const button = document.createElement("button");
    button.className = "devver-toolbar-btn";
    button.setAttribute("aria-label", config.label);
    button.title = config.label;
    button.innerHTML = config.icon;

    if (config.badge && config.badge > 0) {
      const badge = document.createElement("span");
      badge.className = "devver-toolbar-badge";
      badge.textContent = String(config.badge > 99 ? "99+" : config.badge);
      button.appendChild(badge);
    }

    button.addEventListener("click", config.onClick);

    return button;
  }

  /**
   * Set button active state
   */
  public setActive(id: string, active: boolean): void {
    const button = this.buttons.get(id);
    if (button) {
      button.classList.toggle("active", active);
    }
  }

  /**
   * Update button badge
   */
  public setBadge(id: string, count: number): void {
    const button = this.buttons.get(id);
    if (!button) return;

    // Remove existing badge
    const existingBadge = button.querySelector(".devver-toolbar-badge");
    existingBadge?.remove();

    // Add new badge if count > 0
    if (count > 0) {
      const badge = document.createElement("span");
      badge.className = "devver-toolbar-badge";
      badge.textContent = String(count > 99 ? "99+" : count);
      button.appendChild(badge);
    }
  }

  /**
   * Set drawer open state (shifts toolbar to avoid overlap)
   */
  public setDrawerOpen(isOpen: boolean): void {
    this.toolbar?.classList.toggle("devver-toolbar-drawer-open", isOpen);
  }

  /**
   * Destroy the toolbar
   */
  public destroy(): void {
    this.toolbar?.remove();
    this.toolbar = null;
    this.buttons.clear();
  }
}
