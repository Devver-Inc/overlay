/**
 * DevverOverlay - Main orchestrator
 * Coordinates all comment overlay functionality
 */

import type {
  CommentApiConfig,
  CommentItem,
  DevverConfig,
  OverlayOptions,
} from "../types";
import {
  CommentApiAuthError,
  CommentService,
} from "../services/commentService";
import { LogtoAuthService } from "../services/logtoAuthService";
import { getStyles, injectLightDomStyles } from "../style";
import { Toolbar, type ToolbarButton } from "../ui/toolbar";
import { CommentLayer, type PinRenderItem } from "../ui/commentLayer";
import { CommentEditor } from "../ui/commentEditor";
import { CommentDrawer } from "../ui/commentDrawer";
import { Modal } from "../ui/modal";
import { SettingsPanel } from "../ui/settingsPanel";
import { escapeHtml, isCommentUi } from "../utils/sanitize";
import {
  buildAnchorData,
  resolveAbsolutePosition,
  type AnchorData,
} from "../utils/anchor";
import {
  globalScope,
  getScrollPosition,
  getPageUrl,
  getFullUrl,
  scrollTo,
  watchUrlChanges,
} from "./globalScope";
import {
  isInViewport,
  calculateScrollTarget,
} from "../utils/position";

/** SVG Icons */
const ICONS = {
  comment: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
  list: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
  settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
  login: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`,
  user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
};

const DEVVER_LOGO_WHITE_URL = "https://app.devver.app/logo.png";
const DEVVER_LOGO_BLACK_URL = "https://app.devver.app/favicon.png";

/** Default configuration */
const DEFAULT_CONFIG: Required<DevverConfig> = {
  position: "bottom-right",
  showButton: true,
  authorName: "Anonyme",
};

const PENDING_COMMENT_FOCUS_KEY = "devver-overlay-pending-comment-focus";

interface PendingCommentFocus {
  commentId: string;
  pageUrl: string;
}

/**
 * Format date to readable string
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function normalizePageUrl(pageUrl: string): string {
  try {
    const baseUrl = globalScope.location?.href;
    const url = baseUrl ? new URL(pageUrl, baseUrl) : new URL(pageUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return pageUrl.split("#")[0];
  }
}

function buildAuthButtonContent(isAuthenticated: boolean): string {
  const logoUrl = isAuthenticated ? DEVVER_LOGO_BLACK_URL : DEVVER_LOGO_WHITE_URL;
  const text = isAuthenticated ? "Logout" : "Login";

  return `
    <span class="devver-toolbar-auth-content">
      <img class="devver-toolbar-auth-logo" src="${logoUrl}" alt="" aria-hidden="true" />
      <span class="devver-toolbar-auth-text">${text}</span>
    </span>
  `;
}

/**
 * Main DevverOverlay class
 * Orchestrates comments, pins, drawer, and modal components
 */
export class DevverOverlay {
  // Configuration
  private readonly config: Required<DevverConfig>;
  private commentConfig: CommentApiConfig = { mode: "local" };

  // State
  private commentMode = false;
  private comments: CommentItem[] = [];
  private renderScheduled = false;
  private pageUrl: string;
  private currentFullUrl: string;
  private authorName: string;

  // Shadow DOM
  private readonly shadowHost: HTMLElement;
  private readonly shadowRoot: ShadowRoot;

  // Services
  private readonly commentService: CommentService;
  private readonly authService: LogtoAuthService;

  // UI Components
  private readonly modal: Modal;
  private readonly toolbar: Toolbar | null;
  private readonly commentLayer: CommentLayer;
  private readonly commentEditor: CommentEditor;
  private readonly commentDrawer: CommentDrawer;
  private readonly settingsPanel: SettingsPanel;
  private commentModeBackdrop: HTMLElement | null = null;

  // Event handlers (bound for cleanup)
  private readonly handleScroll = (): void => this.scheduleRender();
  private readonly handleResize = (): void => this.scheduleRender();

  constructor(config: DevverConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pageUrl = getPageUrl();
    this.currentFullUrl = getFullUrl();

    // Create Shadow DOM container
    this.shadowHost = document.createElement("div");
    this.shadowHost.id = "devver-overlay-root";
    // Full viewport coverage but non-interactive - children with pointer-events:auto will still receive clicks
    this.shadowHost.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
    document.body.appendChild(this.shadowHost);

    // Attach Shadow DOM
    this.shadowRoot = this.shadowHost.attachShadow({ mode: "open" });

    // Inject styles into Shadow DOM
    this.injectShadowStyles();

    // Initialize services
    this.authService = new LogtoAuthService();
    this.commentService = new CommentService(this.commentConfig, this.pageUrl);

    // Initialize UI components (all render into Shadow DOM)
    this.modal = new Modal(this.shadowRoot);
    this.commentLayer = new CommentLayer(this.shadowRoot);
    this.commentEditor = new CommentEditor(this.shadowRoot);
    this.commentDrawer = new CommentDrawer(this.shadowRoot);
    this.settingsPanel = new SettingsPanel(this.shadowRoot);

    // Get author name from settings or config
    this.authorName = this.settingsPanel.getAuthorName() || this.config.authorName;

    // Listen for author name changes
    this.settingsPanel.setOnChange((name) => {
      if (this.authService.isAuthenticated()) return;
      this.authorName = name;
      // Update comment editor if open
      this.commentEditor.updateAuthorName(name);
    });

    // Listen for toolbar position changes
    this.settingsPanel.setOnPositionChange((position) => {
      this.toolbar?.setPosition(position);
    });

    // Listen for panel close events (when closed via backdrop)
    this.settingsPanel.setOnClose(() => {
      this.updateToolbarState();
    });

    this.commentDrawer.setOnClose(() => {
      this.updateToolbarState();
    });

    // Create toolbar
    this.toolbar = this.config.showButton ? this.createToolbar() : null;

    // Apply saved toolbar position
    if (this.toolbar) {
      const savedPosition = this.settingsPanel.getToolbarPosition();
      this.toolbar.setPosition(savedPosition);
    }

    // Create comment mode backdrop
    this.createCommentModeBackdrop();

    // Setup
    this.setup();
  }

  // ============================================
  // SHADOW DOM SETUP
  // ============================================

  /**
   * Inject styles into the Shadow DOM
   */
  private injectShadowStyles(): void {
    const style = document.createElement("style");
    style.textContent = getStyles();
    this.shadowRoot.appendChild(style);
  }

  // ============================================
  // SETUP & INITIALIZATION
  // ============================================

  /**
   * Setup event listeners and inject styles
   */
  private setup(): void {
    // Inject light DOM styles (cursor styles that need to affect the host page)
    injectLightDomStyles();

    // Global click handler for comment placement
    document.addEventListener("click", this.handleCommentClick, true);

    // Keyboard handler
    document.addEventListener("keydown", this.handleEscape);

    // Scroll and resize handlers for pin repositioning
    globalScope.addEventListener?.("scroll", this.handleScroll, { passive: true });
    globalScope.addEventListener?.("resize", this.handleResize, { passive: true });

    // Watch for URL changes (SPA support)
    watchUrlChanges(() => this.handleUrlChange());

    // Load initial comments
    void this.loadComments();
  }

  /**
   * Handle URL changes (for SPAs with routers)
   */
  private handleUrlChange(): void {
    const newFullUrl = getFullUrl();

    // Only reload if URL actually changed
    if (newFullUrl === this.currentFullUrl) return;

    this.currentFullUrl = newFullUrl;
    this.pageUrl = getPageUrl();

    // Close any open UI
    this.disableComments();
    this.commentDrawer.close();
    this.settingsPanel.close();
    this.modal.close();
    this.updateToolbarState();

    // Update service with new page URL
    this.commentService.updatePageUrl(this.pageUrl);

    // Reload comments for the new page
    void this.loadComments();
  }

  /**
   * Load comments from service
   */
  private async loadComments(): Promise<void> {
    try {
      this.comments = await this.commentService.fetchComments();
      this.renderComments();
      this.updateToolbarBadge();
      this.focusPendingCommentIfNeeded();
    } catch (error) {
      if (error instanceof CommentApiAuthError) {
        this.comments = [];
        this.renderComments();
        this.updateToolbarBadge();
        this.setToolbarButtons();
        return;
      }

      console.warn("[DevverOverlay] Unable to load comments", error);
    }

    // Schedule retries for pins that might not have their anchor elements yet
    // This handles cases where DOM content loads asynchronously (SPAs, lazy loading)
    this.schedulePositionRetries();
  }

  /**
   * Schedule multiple retries to reposition pins
   * Useful when DOM elements load asynchronously
   */
  private schedulePositionRetries(): void {
    const retryDelays = [100, 300, 600, 1000, 2000];

    retryDelays.forEach((delay) => {
      setTimeout(() => {
        // Only re-render if we still have comments and we're on the same page
        if (this.getCurrentPageComments().length > 0 && getPageUrl() === this.pageUrl) {
          this.renderComments();
        }
      }, delay);
    });
  }

  /**
   * Create the comment mode backdrop element
   */
  private createCommentModeBackdrop(): void {
    this.commentModeBackdrop = document.createElement("div");
    this.commentModeBackdrop.className = "devver-comment-mode-backdrop";
    this.shadowRoot.appendChild(this.commentModeBackdrop);
  }

  // ============================================
  // TOOLBAR
  // ============================================

  /**
   * Create the toolbar with buttons
   */
  private createToolbar(): Toolbar {
    const toolbar = new Toolbar(this.shadowRoot);
    this.setToolbarButtons(toolbar);
    return toolbar;
  }

  /**
   * Set toolbar buttons according to current auth configuration.
   */
  private setToolbarButtons(toolbar = this.toolbar): void {
    if (!toolbar) return;

    const buttons: ToolbarButton[] = [
      {
        id: "comment",
        icon: ICONS.comment,
        label: "Mode commentaire",
        onClick: () => this.toggleCommentMode(),
      },
      {
        id: "list",
        icon: ICONS.list,
        label: "Liste des commentaires",
        onClick: () => this.toggleDrawer(),
        badge: this.comments.length,
      },
      {
        id: "settings",
        icon: ICONS.settings,
        label: "Paramètres",
        onClick: () => this.toggleSettings(),
      },
    ];

    if (this.authService.isConfigured()) {
      const isAuthenticated = this.authService.isAuthenticated();
      buttons.push({
        id: "auth",
        icon: buildAuthButtonContent(isAuthenticated),
        label: isAuthenticated ? "Logout Devver" : "Login Devver",
        className: "devver-toolbar-btn-auth",
        onClick: () => {
          void this.toggleAuth();
        },
      });
    }

    toolbar.setButtons(buttons);
    this.updateToolbarState();
    this.updateToolbarBadge();
  }

  /**
   * Update toolbar button states
   */
  private updateToolbarState(): void {
    this.toolbar?.setActive("comment", this.commentMode);
    this.toolbar?.setActive("list", this.commentDrawer.isOpen());
    this.toolbar?.setActive("settings", this.settingsPanel.isOpen());
    this.toolbar?.setActive("auth", this.authService.isAuthenticated());

    // Shift toolbar when any drawer is open
    const drawerOpen = this.commentDrawer.isOpen() || this.settingsPanel.isOpen();
    this.toolbar?.setDrawerOpen(drawerOpen);
  }

  /**
   * Update toolbar badge with comment count
   */
  private updateToolbarBadge(): void {
    this.toolbar?.setBadge("list", this.comments.length);
  }

  // ============================================
  // RENDERING
  // ============================================

  /**
   * Schedule a render on the next animation frame
   * Prevents multiple renders in the same frame
   */
  private scheduleRender(): void {
    if (this.renderScheduled) return;
    this.renderScheduled = true;

    requestAnimationFrame(() => {
      this.renderScheduled = false;
      this.renderComments();
    });
  }

  /**
   * Render all comment pins
   */
  private renderComments(): void {
    const scroll = getScrollPosition();
    const pageComments = this.getCurrentPageComments();

    const pins: PinRenderItem[] = pageComments.map((comment, index) => {
      const pos = resolveAbsolutePosition(comment);
      return {
        comment,
        x: pos.x - scroll.x,
        y: pos.y - scroll.y,
        index: index + 1,
      };
    });

    this.commentLayer.render(pins, (comment) => this.focusComment(comment));

    // Update drawer if open
    if (this.commentDrawer.isOpen()) {
      this.commentDrawer.open(this.comments, (c) => this.focusComment(c));
    }
  }

  // ============================================
  // COMMENT MODE
  // ============================================

  /**
   * Toggle comment mode on/off
   */
  private toggleCommentMode(): void {
    if (this.commentMode) {
      this.disableComments();
    } else {
      this.enableComments();
    }
  }

  /**
   * Enable comment mode
   */
  public enableComments(config?: CommentApiConfig): void {
    if (config) {
      this.configureComments(config);
    }

    if (this.requiresAuthenticatedComments() && !this.authService.isAuthenticated()) {
      this.requestSignIn();
      return;
    }

    // Close other panels first
    this.settingsPanel.close();
    this.commentDrawer.close();

    this.commentMode = true;
    document.body.classList.add("devver-comment-mode");
    this.commentModeBackdrop?.classList.add("devver-visible");
    this.updateToolbarState();
  }

  /**
   * Disable comment mode
   */
  public disableComments(): void {
    this.commentMode = false;
    this.updateToolbarState();
    this.commentEditor.close();
    this.commentLayer.removePreviewPin();
    document.body.classList.remove("devver-comment-mode");
    this.commentModeBackdrop?.classList.remove("devver-visible");
  }

  /**
   * Disable comment mode visuals only (cursor, backdrop)
   * Used when placing a pin but editor is still open
   */
  private disableCommentModeVisuals(): void {
    this.commentMode = false;
    this.updateToolbarState();
    document.body.classList.remove("devver-comment-mode");
    this.commentModeBackdrop?.classList.remove("devver-visible");
  }

  /**
   * Configure the comment service
   */
  public configureComments(config: CommentApiConfig): void {
    this.commentConfig = { ...this.commentConfig, ...config };
    this.authService.configure(
      this.commentConfig.logto,
      this.commentConfig.baseUrl,
      this.commentConfig.organizationId,
    );
    this.commentService.updateConfig(this.buildCommentServiceConfig());
    this.setToolbarButtons();
    void this.initializeConfiguredComments();
  }

  private buildCommentServiceConfig(): CommentApiConfig {
    const requiresAuth = this.requiresAuthenticatedComments();
    const authenticatedEmail = this.getAuthenticatedCommentEmail();
    const authTokenProvider =
      this.commentConfig.authTokenProvider ??
      (this.authService.isConfigured()
        ? () =>
            this.authService.getAccessToken(
              this.commentConfig.baseUrl,
              this.commentConfig.organizationId,
            )
        : undefined);

    return {
      ...this.commentConfig,
      authTokenProvider,
      requiresAuth,
      guestEmail: this.commentConfig.guestEmail ?? authenticatedEmail,
    };
  }

  private async initializeConfiguredComments(): Promise<void> {
    try {
      const handledCallback = await this.authService.handleRedirectCallbackIfNeeded();
      if (this.authService.isAuthenticated()) {
        this.applyAuthenticatedAuthorName();
        this.commentService.updateConfig(this.buildCommentServiceConfig());
      } else {
        this.clearAuthenticatedAuthorName();
      }

      if (handledCallback) {
        this.setToolbarButtons();
      }
    } catch (error) {
      console.warn("[DevverOverlay] Logto callback failed", error);
      this.showAuthMessage("Connexion impossible", "La connexion Logto n'a pas pu être finalisée.");
    }

    await this.loadComments();
  }

  /**
   * Get list of all comments
   */
  public listComments(): CommentItem[] {
    return [...this.comments];
  }

  /**
   * Set author name for new comments
   */
  public setAuthorName(name: string): void {
    if (this.authService.isAuthenticated()) return;
    this.authorName = name;
  }

  public async signIn(): Promise<void> {
    await this.authService.signIn();
    this.applyAuthenticatedAuthorName();
    this.commentService.updateConfig(this.buildCommentServiceConfig());
    this.setToolbarButtons();
    await this.loadComments();
  }

  public async signOut(): Promise<void> {
    await this.authService.signOut();
    this.clearAuthenticatedAuthorName();
    this.commentService.updateConfig(this.buildCommentServiceConfig());
    this.setToolbarButtons();
    await this.loadComments();
  }

  public isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  private async toggleAuth(): Promise<void> {
    if (this.authService.isAuthenticated()) {
      await this.signOut();
      return;
    }

    await this.signIn();
  }

  private requiresAuthenticatedComments(): boolean {
    return (
      this.commentConfig.mode === "api" &&
      this.commentConfig.overlayAccessControl?.commentPermission === "team_only"
    );
  }

  private getAuthenticatedCommentEmail(): string | undefined {
    if (
      this.commentConfig.mode !== "api" ||
      this.commentConfig.overlayAccessControl?.commentPermission !== "email_required" ||
      !this.authService.isAuthenticated()
    ) {
      return undefined;
    }

    return this.authService.getUserEmail() ?? undefined;
  }

  private requiresGuestEmailField(): boolean {
    return (
      this.commentConfig.overlayAccessControl?.commentPermission === "email_required" &&
      !this.commentConfig.guestEmail &&
      !this.getAuthenticatedCommentEmail()
    );
  }

  private applyAuthenticatedAuthorName(): void {
    if (!this.authService.isAuthenticated()) {
      this.clearAuthenticatedAuthorName();
      return;
    }

    const displayName =
      this.authService.getUserDisplayName() ??
      this.authService.getUserEmail() ??
      "Utilisateur Devver";
    this.authorName = displayName;
    this.settingsPanel.setAuthorLock(displayName);
    this.commentEditor.updateAuthorName(displayName);
  }

  private clearAuthenticatedAuthorName(): void {
    this.settingsPanel.clearAuthorLock();
    this.authorName = this.settingsPanel.getAuthorName() || this.config.authorName;
    this.commentEditor.updateAuthorName(this.authorName);
  }

  private showAuthMessage(title: string, message: string): void {
    this.modal.show({
      title,
      content: `<p>${escapeHtml(message)}</p>`,
      closeOnClickOutside: true,
      showBackdrop: true,
    });
  }

  private requestSignIn(): void {
    if (!this.authService.isConfigured()) {
      this.showAuthMessage(
        "Connexion indisponible",
        "La configuration Logto est manquante pour cet overlay.",
      );
      return;
    }

    void this.signIn();
  }

  // ============================================
  // SETTINGS
  // ============================================

  /**
   * Toggle settings panel
   */
  private toggleSettings(): void {
    if (this.settingsPanel.isOpen()) {
      this.settingsPanel.close();
    } else {
      // Close other panels first
      this.disableComments();
      this.commentDrawer.close();
      this.settingsPanel.open();
    }
    this.updateToolbarState();
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * Handle click events for comment placement
   */
  private readonly handleCommentClick = (e: MouseEvent): void => {
    if (!this.commentMode) return;
    if (isCommentUi(e.target)) return;

    // Check if click is inside shadow DOM (on our UI elements)
    const path = e.composedPath();
    if (path.includes(this.shadowHost)) return;

    e.preventDefault();
    e.stopPropagation();

    const anchor = buildAnchorData(e);

    // Show preview pin immediately
    const previewIndex = this.getCurrentPageComments().length + 1;
    this.commentLayer.showPreviewPin(e.clientX, e.clientY, previewIndex);

    // Disable comment mode (cursor returns to normal, backdrop disappears)
    this.disableCommentModeVisuals();

    this.openCommentEditor(e.clientX, e.clientY, anchor);
  };

  /**
   * Handle escape key
   */
  private readonly handleEscape = (e: KeyboardEvent): void => {
    if (e.key !== "Escape") return;

    if (this.settingsPanel.isOpen()) {
      this.settingsPanel.close();
      this.updateToolbarState();
      return;
    }

    if (this.commentEditor.isOpen()) {
      this.commentEditor.close();
      this.disableComments();
      return;
    }

    if (this.commentDrawer.isOpen()) {
      this.commentDrawer.close();
      this.updateToolbarState();
      return;
    }

    if (this.commentMode) {
      this.disableComments();
      return;
    }

    this.modal.close();
  };

  // ============================================
  // COMMENT OPERATIONS
  // ============================================

  /**
   * Open the comment editor at a specific position
   */
  private openCommentEditor(clientX: number, clientY: number, anchor: AnchorData): void {
    const requireEmail = this.requiresGuestEmailField();

    this.commentEditor.open({
      x: clientX,
      y: clientY,
      authorName: this.authorName,
      lockAuthor: this.authService.isAuthenticated(),
      requireEmail,
      onSubmit: async (text, guestEmail) => {
        // Remove preview pin (will be replaced by real pin after save)
        this.commentLayer.removePreviewPin();
        await this.saveComment(text, anchor, guestEmail);
      },
      onCancel: () => {
        // Remove preview pin on cancel
        this.commentLayer.removePreviewPin();
      },
      onChangeAuthor: () => {
        this.settingsPanel.open();
        this.updateToolbarState();
      },
    });
  }

  /**
   * Save a new comment
   */
  private async saveComment(text: string, anchor: AnchorData, guestEmail?: string): Promise<void> {
    try {
      const resolvedGuestEmail =
        guestEmail ?? this.commentConfig.guestEmail ?? this.getAuthenticatedCommentEmail();
      const comment = await this.commentService.createComment({
        text,
        x: anchor.pageX,
        y: anchor.pageY,
        pageUrl: this.pageUrl,
        normX: anchor.normX,
        normY: anchor.normY,
        anchorSelector: anchor.anchorSelector,
        anchorOffsetX: anchor.anchorOffsetX,
        anchorOffsetY: anchor.anchorOffsetY,
      }, this.authorName, resolvedGuestEmail);

      this.comments = [...this.comments, comment];
      this.scheduleRender();
      this.updateToolbarBadge();
    } catch (error) {
      if (error instanceof CommentApiAuthError) {
        this.showAuthMessage(
          error.code === "access_denied" ? "Accès refusé" : "Connexion requise",
          error.code === "access_denied"
            ? "Votre compte n'a pas accès aux commentaires de ce projet."
            : "Connectez-vous à Devver pour publier un commentaire.",
        );
        if (error.code === "auth_required") this.requestSignIn();
        return;
      }

      throw error;
    }
  }

  /**
   * Focus on a specific comment (scroll to it and show modal)
   */
  private focusComment(comment: CommentItem): void {
    if (comment.pageUrl && !this.isCommentOnCurrentPage(comment)) {
      this.navigateToCommentPage(comment);
      return;
    }

    const pos = resolveAbsolutePosition(comment);
    const scroll = getScrollPosition();

    // Calculate viewport position
    const viewportX = pos.x - scroll.x;
    const viewportY = pos.y - scroll.y;

    // Check if we need to scroll
    if (!isInViewport(viewportX, viewportY)) {
      const target = calculateScrollTarget(pos.x, pos.y);
      scrollTo(target.x, target.y);

      // Show modal after scroll completes
      setTimeout(() => {
        const newScroll = getScrollPosition();
        this.showCommentModal(comment, pos.x - newScroll.x, pos.y - newScroll.y);
      }, 350);
    } else {
      this.showCommentModal(comment, viewportX, viewportY);
    }
  }

  /**
   * Show the comment detail modal
   */
  private showCommentModal(comment: CommentItem, anchorX: number, anchorY: number): void {
    // Find comment index
    const index = this.comments.findIndex((c) => c.id === comment.id) + 1;
    const author = comment.author || "Anonyme";
    const date = formatDate(comment.createdAt);

    const content = `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-weight: 600; color: var(--devver-text);">${escapeHtml(author)}</span>
          <span style="color: var(--devver-text-muted); font-size: 12px;">•</span>
          <span style="color: var(--devver-text-muted); font-size: 12px;">${escapeHtml(date)}</span>
        </div>
        <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(comment.text)}</p>
      </div>
    `;

    this.modal.show({
      title: `Commentaire #${index}`,
      content,
      closeOnClickOutside: true,
      showBackdrop: false,
      anchorX,
      anchorY,
    });
  }

  private getCurrentPageComments(): CommentItem[] {
    return this.comments.filter((comment) => this.isCommentOnCurrentPage(comment));
  }

  private isCommentOnCurrentPage(comment: CommentItem): boolean {
    return Boolean(
      comment.pageUrl &&
        normalizePageUrl(comment.pageUrl) === normalizePageUrl(this.pageUrl),
    );
  }

  private navigateToCommentPage(comment: CommentItem): void {
    this.savePendingCommentFocus(comment);
    if (globalScope.location) {
      globalScope.location.href = comment.pageUrl;
    }
  }

  private getPendingCommentFocusKey(): string {
    return `${PENDING_COMMENT_FOCUS_KEY}:${this.commentConfig.projectId ?? "local"}`;
  }

  private savePendingCommentFocus(comment: CommentItem): void {
    try {
      sessionStorage.setItem(
        this.getPendingCommentFocusKey(),
        JSON.stringify({
          commentId: comment.id,
          pageUrl: comment.pageUrl,
        } satisfies PendingCommentFocus),
      );
    } catch {
      // sessionStorage may be unavailable in restricted browser contexts.
    }
  }

  private readPendingCommentFocus(): PendingCommentFocus | null {
    try {
      const raw = sessionStorage.getItem(this.getPendingCommentFocusKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<PendingCommentFocus>;
      if (!parsed.commentId || !parsed.pageUrl) return null;
      return {
        commentId: parsed.commentId,
        pageUrl: parsed.pageUrl,
      };
    } catch {
      return null;
    }
  }

  private clearPendingCommentFocus(): void {
    try {
      sessionStorage.removeItem(this.getPendingCommentFocusKey());
    } catch {
      // sessionStorage may be unavailable in restricted browser contexts.
    }
  }

  private focusPendingCommentIfNeeded(): void {
    const pending = this.readPendingCommentFocus();
    if (!pending) return;
    if (normalizePageUrl(pending.pageUrl) !== normalizePageUrl(this.pageUrl)) return;

    const comment = this.comments.find((item) => item.id === pending.commentId);
    if (!comment || !this.isCommentOnCurrentPage(comment)) return;

    this.clearPendingCommentFocus();
    setTimeout(() => this.focusComment(comment), 250);
  }

  // ============================================
  // DRAWER
  // ============================================

  /**
   * Toggle the comment drawer
   */
  private toggleDrawer(): void {
    if (this.commentDrawer.isOpen()) {
      this.commentDrawer.close();
    } else {
      if (this.requiresAuthenticatedComments() && !this.authService.isAuthenticated()) {
        this.requestSignIn();
        return;
      }

      // Close other panels first
      this.disableComments();
      this.settingsPanel.close();
      this.commentDrawer.open(this.comments, (comment) => this.focusComment(comment));
    }
    this.updateToolbarState();
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Show a generic modal
   */
  public show(options: OverlayOptions = {}): void {
    this.modal.show(options);
  }

  /**
   * Close the modal
   */
  public close(): void {
    this.modal.close();
  }

  /**
   * Check if modal is open
   */
  public isOpen(): boolean {
    return this.modal.isOpen();
  }
}
