/**
 * Devver Overlay - Un overlay simple et élégant pour vos projets
 * @version 1.0.0
 */

interface OverlayOptions {
  title?: string;
  content?: string;
  closeOnClickOutside?: boolean;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

interface DevverConfig {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  showButton?: boolean;
}

class DevverOverlay {
  private overlay: HTMLElement | null = null;
  private options: OverlayOptions = {};
  private drawer: HTMLElement | null = null;
  private drawerBackdrop: HTMLElement | null = null;
  private floatingButton: HTMLElement | null = null;
  private isDrawerOpen: boolean = false;
  private config: DevverConfig = {
    position: "bottom-right",
    showButton: true,
  };

  constructor(config: DevverConfig = {}) {
    this.config = { ...this.config, ...config };
    if (this.config.showButton) {
      this.createFloatingButton();
      this.createDrawer();
    }
  }

  /**
   * Crée le bouton flottant avec le logo
   */
  private createFloatingButton(): void {
    this.floatingButton = document.createElement("button");
    this.floatingButton.className = "devver-floating-button";
    this.floatingButton.setAttribute("aria-label", "Ouvrir Devver Overlay");
    this.floatingButton.innerHTML = `
      <img src="https://www.devver.app/favicon.png" alt="Devver Logo" />
    `;

    this.floatingButton.addEventListener("click", () => this.toggleDrawer());
    document.body.appendChild(this.floatingButton);
  }

  /**
   * Crée le drawer
   */
  private createDrawer(): void {
    // Créer le backdrop
    this.drawerBackdrop = document.createElement("div");
    this.drawerBackdrop.className = "devver-drawer-backdrop";
    this.drawerBackdrop.addEventListener("click", () => this.closeDrawer());
    document.body.appendChild(this.drawerBackdrop);

    // Créer le drawer
    this.drawer = document.createElement("div");
    this.drawer.className = "devver-drawer";
    this.drawer.innerHTML = `
      <div class="devver-drawer-header">
        <div class="devver-drawer-title">
          <img src="https://www.devver.app/favicon.png" alt="Devver Logo" class="devver-drawer-logo" />
          <span>Devver Overlay</span>
        </div>
        <button class="devver-drawer-close" aria-label="Fermer">&times;</button>
      </div>
      <div class="devver-drawer-content">
        <div class="devver-drawer-section">
          <h3>🚀 Actions Rapides</h3>
          <button class="devver-drawer-action" data-action="modal-simple">
            <span class="action-icon">📝</span>
            <span class="action-text">Overlay Simple</span>
          </button>
          <button class="devver-drawer-action" data-action="modal-title">
            <span class="action-icon">🎯</span>
            <span class="action-text">Avec Titre</span>
          </button>
          <button class="devver-drawer-action" data-action="modal-rich">
            <span class="action-icon">✨</span>
            <span class="action-text">Contenu Riche</span>
          </button>
        </div>
        <div class="devver-drawer-section">
          <h3>ℹ️ Informations</h3>
          <div class="devver-info-item">
            <span class="info-label">Version:</span>
            <span class="info-value">1.0.0</span>
          </div>
          <div class="devver-info-item">
            <span class="info-label">Projet:</span>
            <span class="info-value">Devver - Master ESGI</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.drawer);

    // Empêcher la fermeture lors d'un clic dans le drawer
    this.drawer.addEventListener("click", (e) => e.stopPropagation());

    // Event listeners pour le drawer
    const closeBtn = this.drawer.querySelector(".devver-drawer-close");
    closeBtn?.addEventListener("click", () => this.closeDrawer());

    // Actions du drawer
    const actions = this.drawer.querySelectorAll(".devver-drawer-action");
    actions.forEach((action) => {
      action.addEventListener("click", (e) => {
        const actionType = (e.currentTarget as HTMLElement).getAttribute("data-action");
        this.handleDrawerAction(actionType);
      });
    });
  }

  /**
   * Gère les actions du drawer
   */
  private handleDrawerAction(action: string | null): void {
    switch (action) {
      case "modal-simple":
        this.show({
          content: "<p>Ceci est un overlay simple créé depuis le drawer.</p>",
        });
        break;
      case "modal-title":
        this.show({
          title: "Overlay depuis le Drawer",
          content: "<p>Vous avez ouvert cet overlay en utilisant le drawer Devver !</p>",
        });
        break;
      case "modal-rich":
        this.show({
          title: "✨ Fonctionnalités Devver",
          content: `
            <ul style="margin-left: 20px; line-height: 1.8;">
              <li>🎨 Design moderne et responsive</li>
              <li>⚡ Léger et performant</li>
              <li>🎭 Animations fluides</li>
              <li>📱 Compatible mobile</li>
            </ul>
          `,
        });
        break;
    }
  }

  /**
   * Toggle le drawer
   */
  private toggleDrawer(): void {
    if (this.isDrawerOpen) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  }

  /**
   * Ouvre le drawer
   */
  private openDrawer(): void {
    if (!this.drawer) return;
    this.drawer.classList.add("devver-drawer-open");
    this.drawerBackdrop?.classList.add("devver-drawer-backdrop-visible");
    this.floatingButton?.classList.add("devver-button-hidden");
    this.isDrawerOpen = true;
  }

  /**
   * Ferme le drawer
   */
  private closeDrawer(): void {
    if (!this.drawer) return;
    this.drawer.classList.remove("devver-drawer-open");
    this.drawerBackdrop?.classList.remove("devver-drawer-backdrop-visible");
    this.floatingButton?.classList.remove("devver-button-hidden");
    this.isDrawerOpen = false;
  }

  /**
   * Affiche l'overlay
   */
  public show(options: OverlayOptions = {}): void {
    this.options = {
      title: options.title || "",
      content: options.content || "",
      closeOnClickOutside: options.closeOnClickOutside ?? true,
      showCloseButton: options.showCloseButton ?? true,
      onClose: options.onClose,
      className: options.className || "",
    };

    if (this.overlay) {
      this.close();
    }

    this.createOverlay();
  }

  /**
   * Crée l'overlay dans le DOM
   */
  private createOverlay(): void {
    // Créer le conteneur principal
    this.overlay = document.createElement("div");
    this.overlay.className = "devver-overlay";
    if (this.options.className) {
      this.overlay.classList.add(this.options.className);
    }

    // Créer le backdrop
    const backdrop = document.createElement("div");
    backdrop.className = "devver-overlay-backdrop";

    if (this.options.closeOnClickOutside) {
      backdrop.addEventListener("click", () => this.close());
    }

    // Créer le contenu
    const modal = document.createElement("div");
    modal.className = "devver-overlay-modal";
    modal.addEventListener("click", (e) => e.stopPropagation());

    // Header avec titre et bouton fermer
    if (this.options.title || this.options.showCloseButton) {
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
        closeBtn.setAttribute("aria-label", "Fermer");
        closeBtn.addEventListener("click", () => this.close());
        header.appendChild(closeBtn);
      }

      modal.appendChild(header);
    }

    // Body avec contenu
    if (this.options.content) {
      const body = document.createElement("div");
      body.className = "devver-overlay-body";

      if (typeof this.options.content === "string") {
        body.innerHTML = this.options.content;
      }

      modal.appendChild(body);
    }

    // Assembler les éléments
    this.overlay.appendChild(backdrop);
    this.overlay.appendChild(modal);
    document.body.appendChild(this.overlay);

    // Ajouter l'animation d'entrée
    requestAnimationFrame(() => {
      this.overlay?.classList.add("devver-overlay-active");
    });

    // Gérer la touche Escape
    document.addEventListener("keydown", this.handleEscape);
  }

  /**
   * Ferme l'overlay
   */
  public close(): void {
    if (!this.overlay) return;

    this.overlay.classList.remove("devver-overlay-active");

    setTimeout(() => {
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      this.overlay = null;

      if (this.options.onClose) {
        this.options.onClose();
      }
    }, 300); // Correspond à la durée de l'animation CSS

    document.removeEventListener("keydown", this.handleEscape);
  }

  /**
   * Gère la touche Escape
   */
  private handleEscape = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      if (this.isDrawerOpen) {
        this.closeDrawer();
      } else {
        this.close();
      }
    }
  };

  /**
   * Vérifie si l'overlay est actuellement affiché
   */
  public isOpen(): boolean {
    return this.overlay !== null;
  }
}

// Instance globale
const devverOverlay = new DevverOverlay();

// Exposition de l'API globale
declare global {
  interface Window {
    DevverOverlay: {
      show: (options?: OverlayOptions) => void;
      close: () => void;
      isOpen: () => boolean;
    };
  }
}

window.DevverOverlay = {
  show: (options) => devverOverlay.show(options),
  close: () => devverOverlay.close(),
  isOpen: () => devverOverlay.isOpen(),
};

// Injection du CSS
const style = document.createElement("style");
style.textContent = `
  /* Overlay Styles */
  .devver-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .devver-overlay-active {
    opacity: 1;
    pointer-events: all;
  }

  .devver-overlay-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
  }

  .devver-overlay-modal {
    position: relative;
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 90%;
    max-height: 90vh;
    overflow: auto;
    transform: scale(0.9);
    transition: transform 0.3s ease;
  }

  .devver-overlay-active .devver-overlay-modal {
    transform: scale(1);
  }

  .devver-overlay-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #e5e7eb;
  }

  .devver-overlay-title {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #111827;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .devver-overlay-close {
    background: none;
    border: none;
    font-size: 32px;
    line-height: 1;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .devver-overlay-close:hover {
    background: #f3f4f6;
    color: #111827;
  }

  .devver-overlay-body {
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #374151;
    line-height: 1.6;
  }

  /* Floating Button Styles */
  .devver-floating-button {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9998;
    transition: all 0.3s ease;
    padding: 12px;
    color: white;
  }

  .devver-floating-button:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
  }

  .devver-floating-button:active {
    transform: scale(0.95);
  }

  .devver-floating-button.devver-button-hidden {
    transform: scale(0);
    opacity: 0;
  }

  .devver-floating-button img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  /* Drawer Backdrop */
  .devver-drawer-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
    z-index: 9998;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }

  .devver-drawer-backdrop-visible {
    opacity: 1;
    pointer-events: all;
  }

  /* Drawer Styles */
  .devver-drawer {
    position: fixed;
    top: 0;
    right: -350px;
    width: 350px;
    height: 100vh;
    background: white;
    box-shadow: -2px 0 20px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    transition: right 0.3s ease;
    display: flex;
    flex-direction: column;
  }

  .devver-drawer-open {
    right: 0;
  }

  .devver-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 2px solid #f3f4f6;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .devver-drawer-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 18px;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .devver-drawer-logo {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }

  .devver-drawer-close {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    font-size: 28px;
    line-height: 1;
    cursor: pointer;
    color: white;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .devver-drawer-close:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .devver-drawer-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .devver-drawer-section {
    margin-bottom: 32px;
  }

  .devver-drawer-section h3 {
    font-size: 14px;
    font-weight: 600;
    color: #6b7280;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .devver-drawer-action {
    width: 100%;
    padding: 12px 16px;
    margin-bottom: 8px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px;
    transition: all 0.2s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .devver-drawer-action:hover {
    background: #f3f4f6;
    border-color: #667eea;
    transform: translateX(4px);
  }

  .devver-drawer-action:active {
    transform: translateX(2px);
  }

  .action-icon {
    font-size: 20px;
  }

  .action-text {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
  }

  .devver-info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #f3f4f6;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .info-label {
    font-size: 14px;
    color: #6b7280;
  }

  .info-value {
    font-size: 14px;
    font-weight: 500;
    color: #111827;
  }

  /* Mobile Responsive */
  @media (max-width: 640px) {
    .devver-overlay-modal {
      max-width: 95%;
      margin: 16px;
    }

    .devver-overlay-header {
      padding: 16px;
    }

    .devver-overlay-body {
      padding: 16px;
    }

    .devver-floating-button {
      bottom: 16px;
      right: 16px;
      width: 46px;
      height: 46px;
    }

    .devver-drawer {
      width: 100%;
      right: -100%;
    }
  }
`;

document.head.appendChild(style);

// Export pour utilisation en module
export default devverOverlay;
export type { DevverConfig, OverlayOptions };
