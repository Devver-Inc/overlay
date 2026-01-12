/**
 * Settings Panel - User settings configuration
 */

const STORAGE_KEY = "devver-overlay-author";
const POSITION_STORAGE_KEY = "devver-overlay-toolbar-position";

export type ToolbarPosition = "bottom-left" | "bottom-center" | "bottom-right";

type ChangeHandler = (authorName: string) => void;
type PositionChangeHandler = (position: ToolbarPosition) => void;
type CloseHandler = () => void;

/**
 * SettingsPanel manages user preferences
 */
export class SettingsPanel {
  private panel: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private isOpenState = false;
  private onChange: ChangeHandler | null = null;
  private onPositionChange: PositionChangeHandler | null = null;
  private onCloseCallback: CloseHandler | null = null;

  constructor() {
    this.create();
  }

  /**
   * Create the settings panel element
   */
  private create(): void {
    // Create backdrop
    this.backdrop = document.createElement("div");
    this.backdrop.className = "devver-settings-backdrop";
    this.backdrop.dataset.devverCommentUi = "true";
    this.backdrop.addEventListener("click", () => {
      this.close();
      this.onCloseCallback?.();
    });
    document.body.appendChild(this.backdrop);

    // Create panel
    this.panel = document.createElement("div");
    this.panel.className = "devver-settings";
    this.panel.dataset.devverCommentUi = "true";

    const savedName = this.getSavedAuthorName();
    const savedPosition = this.getSavedToolbarPosition();

    this.panel.innerHTML = `
      <div class="devver-settings-header">
        <span class="devver-settings-title">Paramètres</span>
        <button class="devver-settings-close" aria-label="Fermer">×</button>
      </div>
      <div class="devver-settings-body">
        <div class="devver-settings-field">
          <label class="devver-settings-label" for="devver-author-name">Votre nom</label>
          <input 
            type="text" 
            id="devver-author-name"
            class="devver-settings-input" 
            placeholder="Entrez votre nom..."
            value="${this.escapeAttr(savedName)}"
            autocomplete="name"
          />
        </div>
        <div class="devver-settings-field devver-settings-field-position">
          <label class="devver-settings-label">Position de la toolbar</label>
          <div class="devver-settings-position-options">
            <label class="devver-settings-position-option${savedPosition === "bottom-left" ? " selected" : ""}">
              <input type="radio" name="toolbar-position" value="bottom-left" ${savedPosition === "bottom-left" ? "checked" : ""} />
              <span class="devver-settings-position-radio"></span>
              <span>En bas à gauche</span>
            </label>
            <label class="devver-settings-position-option${savedPosition === "bottom-center" ? " selected" : ""}">
              <input type="radio" name="toolbar-position" value="bottom-center" ${savedPosition === "bottom-center" ? "checked" : ""} />
              <span class="devver-settings-position-radio"></span>
              <span>En bas au centre</span>
            </label>
            <label class="devver-settings-position-option${savedPosition === "bottom-right" ? " selected" : ""}">
              <input type="radio" name="toolbar-position" value="bottom-right" ${savedPosition === "bottom-right" ? "checked" : ""} />
              <span class="devver-settings-position-radio"></span>
              <span>En bas à droite</span>
            </label>
          </div>
        </div>
        <button class="devver-settings-save">Enregistrer</button>
      </div>
    `;

    // Close button
    const closeBtn = this.panel.querySelector(".devver-settings-close");
    closeBtn?.addEventListener("click", () => this.close());

    // Position radio buttons - update selected class
    const positionOptions = this.panel.querySelectorAll(".devver-settings-position-option");
    positionOptions.forEach((option) => {
      const radio = option.querySelector("input[type='radio']") as HTMLInputElement;
      radio?.addEventListener("change", () => {
        positionOptions.forEach(opt => opt.classList.remove("selected"));
        option.classList.add("selected");
      });
    });

    // Save button
    const saveBtn = this.panel.querySelector(".devver-settings-save");
    const input = this.panel.querySelector("#devver-author-name") as HTMLInputElement;

    saveBtn?.addEventListener("click", () => {
      // Save author name
      const value = input?.value.trim() || "";
      this.saveAuthorName(value);
      this.onChange?.(value || "Anonyme");

      // Save toolbar position
      const selectedPosition = this.panel?.querySelector("input[name='toolbar-position']:checked") as HTMLInputElement;
      if (selectedPosition) {
        const position = selectedPosition.value as ToolbarPosition;
        this.saveToolbarPosition(position);
        this.onPositionChange?.(position);
      }

      this.close();
    });

    // Enter key to save
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        (saveBtn as HTMLButtonElement)?.click();
      }
    });

    document.body.appendChild(this.panel);
  }

  /**
   * Escape HTML attribute value
   */
  private escapeAttr(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /**
   * Set change handler for author name
   */
  public setOnChange(handler: ChangeHandler): void {
    this.onChange = handler;
  }

  /**
   * Set change handler for toolbar position
   */
  public setOnPositionChange(handler: PositionChangeHandler): void {
    this.onPositionChange = handler;
  }

  /**
   * Set close handler (called when panel is closed)
   */
  public setOnClose(handler: CloseHandler): void {
    this.onCloseCallback = handler;
  }

  /**
   * Open the settings panel
   */
  public open(): void {
    // Update input value with current saved name
    const input = this.panel?.querySelector("#devver-author-name") as HTMLInputElement;
    if (input) {
      input.value = this.getSavedAuthorName();
    }

    // Update position radio buttons
    const savedPosition = this.getSavedToolbarPosition();
    const positionOptions = this.panel?.querySelectorAll(".devver-settings-position-option");
    positionOptions?.forEach((option) => {
      const radio = option.querySelector("input[type='radio']") as HTMLInputElement;
      if (radio) {
        radio.checked = radio.value === savedPosition;
        option.classList.toggle("selected", radio.value === savedPosition);
      }
    });

    this.backdrop?.classList.add("visible");
    this.panel?.classList.add("open");
    this.isOpenState = true;

    // Focus the input
    setTimeout(() => input?.focus(), 250);
  }

  /**
   * Close the settings panel
   */
  public close(): void {
    this.backdrop?.classList.remove("visible");
    this.panel?.classList.remove("open");
    this.isOpenState = false;
  }

  /**
   * Toggle the panel open/closed
   */
  public toggle(): void {
    if (this.isOpenState) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Check if panel is open
   */
  public isOpen(): boolean {
    return this.isOpenState;
  }

  /**
   * Get saved author name from localStorage
   */
  public getSavedAuthorName(): string {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  /**
   * Save author name to localStorage
   */
  private saveAuthorName(name: string): void {
    try {
      if (name) {
        localStorage.setItem(STORAGE_KEY, name);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage not available
    }
  }

  /**
   * Get current author name (saved or default)
   */
  public getAuthorName(): string {
    return this.getSavedAuthorName() || "Anonyme";
  }

  /**
   * Get saved toolbar position from localStorage
   */
  public getSavedToolbarPosition(): ToolbarPosition {
    try {
      const saved = localStorage.getItem(POSITION_STORAGE_KEY) as ToolbarPosition;
      if (saved && ["bottom-left", "bottom-center", "bottom-right"].includes(saved)) {
        return saved;
      }
    } catch {
      // localStorage not available
    }
    return "bottom-center"; // default
  }

  /**
   * Save toolbar position to localStorage
   */
  private saveToolbarPosition(position: ToolbarPosition): void {
    try {
      localStorage.setItem(POSITION_STORAGE_KEY, position);
    } catch {
      // localStorage not available
    }
  }

  /**
   * Get current toolbar position
   */
  public getToolbarPosition(): ToolbarPosition {
    return this.getSavedToolbarPosition();
  }
}
