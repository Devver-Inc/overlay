/**
 * Comment Editor - UI for creating new comments
 */

type SubmitHandler = (text: string) => void | Promise<void>;
type CancelHandler = () => void;
type ChangeAuthorHandler = () => void;

interface CommentEditorOptions {
  x: number;
  y: number;
  authorName: string;
  onSubmit: SubmitHandler;
  onCancel: CancelHandler;
  onChangeAuthor: ChangeAuthorHandler;
}

/**
 * Escape HTML for safe display
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * CommentEditor manages the comment input form
 */
export class CommentEditor {
  private editor: HTMLElement | null = null;
  private readonly container: HTMLElement | ShadowRoot;

  constructor(container: HTMLElement | ShadowRoot) {
    this.container = container;
  }

  /**
   * Open the editor at specified position
   */
  public open(options: CommentEditorOptions): void {
    this.close();

    const editor = document.createElement("div");
    editor.className = "devver-comment-editor";
    editor.style.left = `${options.x}px`;
    editor.style.top = `${options.y}px`;

    editor.innerHTML = `
      <div class="devver-comment-editor-header">
        <span>Nouveau commentaire</span>
        <button type="button" class="devver-comment-editor-close" aria-label="Fermer">×</button>
      </div>
      <form class="devver-comment-editor-form">
        <div class="devver-comment-editor-author">
          <span class="devver-comment-editor-author-label">Publié par</span>
          <button type="button" class="devver-comment-editor-change-author">
            <span class="devver-comment-editor-author-name">${escapeHtml(options.authorName)}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
        </div>
        <textarea name="comment" placeholder="Écrivez votre commentaire..." required></textarea>
        <div class="devver-comment-editor-actions">
          <button type="button" class="devver-comment-editor-cancel">Annuler</button>
          <button type="submit" class="devver-comment-editor-submit">Publier</button>
        </div>
      </form>
    `;

    const closeBtn = editor.querySelector(".devver-comment-editor-close");
    const cancelBtn = editor.querySelector(".devver-comment-editor-cancel");
    const changeAuthorBtn = editor.querySelector(".devver-comment-editor-change-author");
    const form = editor.querySelector("form");
    const textarea = editor.querySelector("textarea");

    const handleCancel = (): void => {
      options.onCancel();
      this.close();
    };

    closeBtn?.addEventListener("click", handleCancel);
    cancelBtn?.addEventListener("click", handleCancel);

    changeAuthorBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      options.onChangeAuthor();
    });

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!(textarea instanceof HTMLTextAreaElement)) return;
      const value = textarea.value.trim();
      if (!value) return;

      // Disable form while submitting
      const submitBtn = editor.querySelector(".devver-comment-editor-submit") as HTMLButtonElement;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "...";
      }

      await options.onSubmit(value);
      this.close();
    });

    this.container.appendChild(editor);
    this.editor = editor;

    // Auto-focus textarea
    requestAnimationFrame(() => {
      (textarea as HTMLTextAreaElement)?.focus();
    });
  }

  /**
   * Update the displayed author name
   */
  public updateAuthorName(name: string): void {
    const nameEl = this.editor?.querySelector(".devver-comment-editor-author-name");
    if (nameEl) {
      nameEl.textContent = name;
    }
  }

  /**
   * Close and remove the editor
   */
  public close(): void {
    this.editor?.remove();
    this.editor = null;
  }

  /**
   * Check if editor is currently open
   */
  public isOpen(): boolean {
    return this.editor !== null;
  }
}
