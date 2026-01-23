/**
 * Comment Drawer - Modal panel listing all comments
 */

import type { CommentItem } from "../types";
import { escapeHtml } from "../utils/sanitize";

type SelectHandler = (comment: CommentItem) => void;
type CloseHandler = () => void;

/**
 * Format date to short readable string
 */
function formatDateShort(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * CommentDrawer displays a list of all comments in a centered modal panel
 */
export class CommentDrawer {
  private drawer: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private isOpenState = false;
  private onCloseCallback: CloseHandler | null = null;
  private readonly container: HTMLElement | ShadowRoot;

  constructor(container: HTMLElement | ShadowRoot) {
    this.container = container;
  }

  /**
   * Open the drawer with a list of comments
   */
  public open(comments: CommentItem[], onSelect: SelectHandler): void {
    if (!this.drawer) {
      this.createDrawer();
    }
    this.renderList(comments, onSelect);
    this.drawer?.classList.add("devver-comment-drawer-open");
    this.backdrop?.classList.add("devver-comment-drawer-backdrop-visible");
    this.isOpenState = true;
  }

  /**
   * Close the drawer
   */
  public close(): void {
    this.drawer?.classList.remove("devver-comment-drawer-open");
    this.backdrop?.classList.remove("devver-comment-drawer-backdrop-visible");
    this.isOpenState = false;
  }

  /**
   * Toggle the drawer open/closed
   */
  public toggle(comments: CommentItem[], onSelect: SelectHandler): void {
    if (this.isOpenState) {
      this.close();
    } else {
      this.open(comments, onSelect);
    }
  }

  /**
   * Check if drawer is open
   */
  public isOpen(): boolean {
    return this.isOpenState;
  }

  /**
   * Set close handler (called when drawer is closed via backdrop)
   */
  public setOnClose(handler: CloseHandler): void {
    this.onCloseCallback = handler;
  }

  /**
   * Create the drawer DOM elements
   */
  private createDrawer(): void {
    // Backdrop
    this.backdrop = document.createElement("div");
    this.backdrop.className = "devver-comment-drawer-backdrop";
    this.backdrop.addEventListener("click", () => {
      this.close();
      this.onCloseCallback?.();
    });
    this.container.appendChild(this.backdrop);

    // Drawer panel
    this.drawer = document.createElement("div");
    this.drawer.className = "devver-comment-drawer";
    this.container.appendChild(this.drawer);
  }

  /**
   * Render the list of comments
   */
  private renderList(comments: CommentItem[], onSelect: SelectHandler): void {
    if (!this.drawer) return;

    const count = comments.length;
    const countText = count === 0
      ? "Aucun commentaire"
      : count === 1
        ? "1 commentaire"
        : `${count} commentaires`;

    const list = comments
      .map((comment, index) => {
        const num = index + 1;
        const author = escapeHtml(comment.author || "Anonyme");
        const date = formatDateShort(comment.createdAt);
        const text = escapeHtml(
          comment.text.length > 60
            ? `${comment.text.slice(0, 57)}...`
            : comment.text
        );

        return `
          <button class="devver-comment-drawer-item" data-id="${comment.id}">
            <span class="devver-comment-drawer-num">${num}</span>
            <div class="devver-comment-drawer-content">
              <div class="devver-comment-drawer-meta">
                <span class="devver-comment-drawer-author">${author}</span>
                <span class="devver-comment-drawer-date">${date}</span>
              </div>
              <div class="devver-comment-drawer-text">${text}</div>
            </div>
          </button>
        `;
      })
      .join("");

    this.drawer.innerHTML = `
      <div class="devver-comment-drawer-header">
        <span>${countText}</span>
        <button class="devver-comment-drawer-close" aria-label="Fermer">×</button>
      </div>
      <div class="devver-comment-drawer-list">
        ${count > 0 ? list : '<div class="devver-comment-drawer-empty">Aucun commentaire sur cette page</div>'}
      </div>
    `;

    // Close button handler
    const closeBtn = this.drawer.querySelector(".devver-comment-drawer-close");
    closeBtn?.addEventListener("click", () => {
      this.close();
      this.onCloseCallback?.();
    });

    // Item click handlers
    const items = this.drawer.querySelectorAll(".devver-comment-drawer-item");
    items.forEach((el) => {
      el.addEventListener("click", () => {
        const id = (el as HTMLElement).dataset.id;
        const found = comments.find((c) => c.id === id);
        if (found) {
          onSelect(found);
          this.close();
        }
      });
    });
  }
}
