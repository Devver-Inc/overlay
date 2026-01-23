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
import { CommentService } from "../services/commentService";
import { getStyles, injectLightDomStyles } from "../style";
import { Toolbar } from "../ui/toolbar";
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
};

/** Default configuration */
const DEFAULT_CONFIG: Required<DevverConfig> = {
  position: "bottom-right",
  showButton: true,
  authorName: "Anonyme",
};

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
    this.comments = await this.commentService.fetchComments();
    this.renderComments();
    this.updateToolbarBadge();

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
        if (this.comments.length > 0 && getPageUrl() === this.pageUrl) {
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

    toolbar.setButtons([
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
    ]);

    return toolbar;
  }

  /**
   * Update toolbar button states
   */
  private updateToolbarState(): void {
    this.toolbar?.setActive("comment", this.commentMode);
    this.toolbar?.setActive("list", this.commentDrawer.isOpen());
    this.toolbar?.setActive("settings", this.settingsPanel.isOpen());

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

    const pins: PinRenderItem[] = this.comments.map((comment, index) => {
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
    this.commentService.updateConfig(this.commentConfig);
    void this.loadComments();
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
    this.authorName = name;
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
    const previewIndex = this.comments.length + 1;
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
    this.commentEditor.open({
      x: clientX,
      y: clientY,
      authorName: this.authorName,
      onSubmit: async (text) => {
        // Remove preview pin (will be replaced by real pin after save)
        this.commentLayer.removePreviewPin();
        await this.saveComment(text, anchor);
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
  private async saveComment(text: string, anchor: AnchorData): Promise<void> {
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
    }, this.authorName);

    this.comments = [...this.comments, comment];
    this.scheduleRender();
    this.updateToolbarBadge();
  }

  /**
   * Focus on a specific comment (scroll to it and show modal)
   */
  private focusComment(comment: CommentItem): void {
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
