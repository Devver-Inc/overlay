(function(exports) {
  "use strict";
  class CommentService {
    pageUrl;
    config;
    constructor(config = {}, pageUrl) {
      this.pageUrl = pageUrl ?? globalThis.location.href.split("#")[0];
      this.config = {
        mode: "local",
        ...config
      };
    }
    updateConfig(config) {
      this.config = { ...this.config, ...config };
    }
    get storageKey() {
      return `devver-comments:${this.pageUrl}`;
    }
    shouldUseApi() {
      return Boolean(
        this.config.mode === "api" && this.config.baseUrl && this.config.projectId
      );
    }
    async fetchComments() {
      if (this.shouldUseApi()) {
        try {
          const url = `${this.config.baseUrl}/comments?projectId=${encodeURIComponent(
            this.config.projectId
          )}&pageUrl=${encodeURIComponent(this.pageUrl)}`;
          const response = await fetch(url, {
            headers: this.buildHeaders()
          });
          if (!response.ok) {
            throw new Error(`API error ${response.status}`);
          }
          const data = await response.json();
          if (Array.isArray(data)) {
            return data;
          }
        } catch (error) {
          console.warn("[DevverOverlay] API fetch failed, falling back to local", error);
        }
      }
      return this.readLocal();
    }
    async createComment(input, authorName) {
      const comment = {
        ...input,
        id: this.generateId(),
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        author: authorName || "Anonyme"
      };
      if (this.shouldUseApi()) {
        try {
          const url = `${this.config.baseUrl}/comments`;
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...this.buildHeaders()
            },
            body: JSON.stringify({
              ...comment,
              projectId: this.config.projectId
            })
          });
          if (!response.ok) {
            throw new Error(`API error ${response.status}`);
          }
          const data = await response.json();
          return data;
        } catch (error) {
          console.warn("[DevverOverlay] API save failed, using local storage", error);
        }
      }
      const current = this.readLocal();
      const next = [...current, comment];
      this.writeLocal(next);
      return comment;
    }
    buildHeaders() {
      const headers = {};
      if (this.config.authToken) {
        headers.Authorization = `Bearer ${this.config.authToken}`;
      }
      return headers;
    }
    readLocal() {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed;
      } catch (error) {
        console.warn("[DevverOverlay] Unable to read local comments", error);
        return [];
      }
    }
    writeLocal(comments) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(comments));
      } catch (error) {
        console.warn("[DevverOverlay] Unable to persist local comments", error);
      }
    }
    generateId() {
      if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
      }
      return `devver-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  }
  let injected = false;
  const css = `
  /* ============================================
   * CSS VARIABLES - Design Tokens
   * ============================================ */
  :root {
    --devver-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    
    /* Colors - Dark Theme */
    --devver-bg-dark: #13151a;
    --devver-bg-card: #1e2028;
    --devver-bg-card-hover: #262932;
    --devver-bg-elevated: #23262f;
    --devver-border: rgba(255, 255, 255, 0.08);
    --devver-border-hover: rgba(255, 255, 255, 0.15);
    
    /* Text */
    --devver-text: #f1f1f1;
    --devver-text-secondary: #a0a0a0;
    --devver-text-muted: #6b6b6b;
    
    /* Accent - White */
    --devver-accent: #ffffff;
    --devver-accent-light: #ffffff;
    --devver-accent-dark: #e5e5e5;
    --devver-accent-glow: rgba(255, 255, 255, 0.2);
    
    /* Pin */
    --devver-pin: #ff5d5d;
    --devver-pin-glow: rgba(255, 93, 93, 0.3);
    
    /* Shadows */
    --devver-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    --devver-shadow-lg: 0 8px 40px rgba(0, 0, 0, 0.5);
    --devver-glow: 0 0 20px var(--devver-accent-glow);
    
    /* Spacing */
    --devver-radius: 8px;
    --devver-radius-lg: 12px;
    --devver-radius-full: 9999px;
    
    /* Transitions */
    --devver-transition: 150ms ease;
    --devver-transition-slow: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* ============================================
   * FLOATING TOOLBAR (Bottom center, like Astro)
   * ============================================ */
  .devver-toolbar {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px;
    background: var(--devver-bg-dark);
    border: 1px solid var(--devver-border);
    border-radius: var(--devver-radius-full);
    box-shadow: var(--devver-shadow-lg);
    z-index: 9998;
    transition: left var(--devver-transition-slow), right var(--devver-transition-slow), transform var(--devver-transition-slow);
  }

  /* Toolbar position variants - using CSS custom property for available width */
  .devver-toolbar {
    --devver-available-width: 100vw;
  }

  .devver-toolbar.devver-toolbar-drawer-open {
    --devver-available-width: calc(100vw - 400px);
  }

  .devver-toolbar.devver-toolbar-bottom-left {
    left: 20px;
    right: auto;
    transform: translateX(0);
  }

  .devver-toolbar.devver-toolbar-bottom-center {
    left: calc(var(--devver-available-width) / 2);
    right: auto;
    transform: translateX(-50%);
  }

  .devver-toolbar.devver-toolbar-bottom-right {
    left: calc(var(--devver-available-width) - 20px);
    right: auto;
    transform: translateX(-100%);
  }

  .devver-toolbar-btn {
    position: relative;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--devver-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--devver-transition);
    font-size: 18px;
  }

  .devver-toolbar-btn:hover {
    background: var(--devver-bg-elevated);
    color: var(--devver-text);
  }

  .devver-toolbar-btn.active {
    background: var(--devver-accent);
    color: var(--devver-bg-dark);
    box-shadow: var(--devver-glow);
  }

  .devver-toolbar-btn.active:hover {
    background: var(--devver-accent-light);
  }

  .devver-toolbar-divider {
    width: 1px;
    height: 24px;
    background: var(--devver-border);
    margin: 0 4px;
  }

  .devver-toolbar-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    background: var(--devver-pin);
    color: white;
    font-size: 10px;
    font-weight: 600;
    border-radius: var(--devver-radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--devver-font);
  }

  /* ============================================
   * OVERLAY & MODAL
   * ============================================ */
  .devver-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity var(--devver-transition-slow);
    pointer-events: none;
  }

  .devver-overlay-active {
    opacity: 1;
    pointer-events: all;
  }

  .devver-overlay-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
  }

  .devver-overlay-modal {
    position: relative;
    background: var(--devver-bg-card);
    border: 1px solid var(--devver-border);
    border-radius: var(--devver-radius-lg);
    box-shadow: var(--devver-shadow-lg);
    max-width: 90%;
    max-height: 90vh;
    overflow: auto;
    transform: scale(0.95) translateY(10px);
    transition: transform var(--devver-transition-slow);
    color: var(--devver-text);
  }

  .devver-overlay-active .devver-overlay-modal {
    transform: scale(1) translateY(0);
  }

  .devver-overlay-modal-anchored {
    position: fixed;
    max-width: 360px;
    min-width: 300px;
    transform: none;
    animation: devver-pop var(--devver-transition-slow);
  }

  @keyframes devver-pop {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .devver-overlay-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--devver-border);
  }

  .devver-overlay-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--devver-text);
    font-family: var(--devver-font);
    letter-spacing: -0.01em;
  }

  .devver-overlay-close {
    background: none;
    border: none;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    color: var(--devver-text-muted);
    padding: 6px;
    margin: -6px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--devver-radius);
    transition: all var(--devver-transition);
  }

  .devver-overlay-close:hover {
    background: var(--devver-bg-elevated);
    color: var(--devver-text);
  }

  .devver-overlay-body {
    padding: 16px 20px 20px;
    font-family: var(--devver-font);
    font-size: 14px;
    color: var(--devver-text-secondary);
    line-height: 1.6;
  }

  .devver-overlay-body p {
    margin: 0;
  }

  /* ============================================
   * COMMENT PINS
   * ============================================ */
  .devver-comment-layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9997;
  }

  .devver-comment-pin {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid var(--devver-bg-dark);
    background: var(--devver-pin);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    font-family: var(--devver-font);
    cursor: pointer;
    box-shadow: var(--devver-shadow), 0 0 0 0 var(--devver-pin-glow);
    pointer-events: auto;
    transition: all var(--devver-transition);
  }

  .devver-comment-pin:hover {
    transform: translate(-50%, -50%) scale(1.15);
    box-shadow: var(--devver-shadow), 0 0 0 6px var(--devver-pin-glow);
  }

  .devver-comment-pin:focus {
    outline: none;
    box-shadow: var(--devver-shadow), 0 0 0 6px var(--devver-pin-glow);
  }

  .devver-comment-pin-preview {
    animation: devver-pin-pulse 1.5s ease-in-out infinite;
  }

  @keyframes devver-pin-pulse {
    0%, 100% {
      box-shadow: var(--devver-shadow), 0 0 0 0 var(--devver-pin-glow);
    }
    50% {
      box-shadow: var(--devver-shadow), 0 0 0 8px var(--devver-pin-glow);
    }
  }

  /* ============================================
   * COMMENT EDITOR
   * ============================================ */
  .devver-comment-editor {
    position: fixed;
    transform: translate(-50%, calc(-100% - 16px));
    background: var(--devver-bg-card);
    border: 1px solid var(--devver-border);
    border-radius: var(--devver-radius-lg);
    box-shadow: var(--devver-shadow-lg);
    width: 320px;
    z-index: 10000;
    overflow: hidden;
    animation: devver-pop var(--devver-transition-slow);
    color: var(--devver-text);
  }

  .devver-comment-editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--devver-border);
  }

  .devver-comment-editor-header span {
    font-weight: 600;
    font-size: 13px;
    color: var(--devver-text);
    font-family: var(--devver-font);
  }

  .devver-comment-editor-close {
    background: none;
    border: none;
    color: var(--devver-text-muted);
    font-size: 18px;
    cursor: pointer;
    padding: 4px;
    margin: -4px;
    border-radius: var(--devver-radius);
    transition: all var(--devver-transition);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .devver-comment-editor-close:hover {
    background: var(--devver-bg-elevated);
    color: var(--devver-text);
  }

  .devver-comment-editor-form {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .devver-comment-editor textarea {
    width: 100%;
    min-height: 80px;
    background: var(--devver-bg-dark);
    border: 1px solid var(--devver-border);
    border-radius: var(--devver-radius);
    padding: 12px;
    resize: vertical;
    font-family: var(--devver-font);
    font-size: 14px;
    color: var(--devver-text);
    transition: all var(--devver-transition);
    box-sizing: border-box;
  }

  .devver-comment-editor textarea::placeholder {
    color: var(--devver-text-muted);
  }

  .devver-comment-editor textarea:focus {
    outline: none;
    border-color: var(--devver-accent);
    box-shadow: 0 0 0 3px var(--devver-accent-glow);
  }

  .devver-comment-editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .devver-comment-editor-actions button {
    border: none;
    border-radius: var(--devver-radius);
    padding: 10px 16px;
    cursor: pointer;
    font-weight: 500;
    font-size: 13px;
    font-family: var(--devver-font);
    transition: all var(--devver-transition);
  }

  .devver-comment-editor-cancel {
    background: var(--devver-bg-elevated);
    color: var(--devver-text-secondary);
  }

  .devver-comment-editor-cancel:hover {
    background: var(--devver-bg-card-hover);
    color: var(--devver-text);
  }

  .devver-comment-editor-submit {
    background: var(--devver-accent);
    color: var(--devver-bg-dark);
    font-weight: 600;
  }

  .devver-comment-editor-submit:hover {
    background: var(--devver-accent-light);
  }

  .devver-comment-editor-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .devver-comment-editor-author {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--devver-border);
  }

  .devver-comment-editor-author-label {
    font-size: 12px;
    color: var(--devver-text-muted);
  }

  .devver-comment-editor-change-author {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: var(--devver-bg-dark);
    border: 1px solid var(--devver-border);
    border-radius: var(--devver-radius-full);
    color: var(--devver-text);
    font-size: 13px;
    font-family: var(--devver-font);
    cursor: pointer;
    transition: all var(--devver-transition);
  }

  .devver-comment-editor-change-author:hover {
    background: var(--devver-bg-elevated);
    border-color: var(--devver-border-hover);
  }

  .devver-comment-editor-change-author svg {
    color: var(--devver-text-muted);
  }

  .devver-comment-editor-author-name {
    font-weight: 500;
  }

  /* ============================================
   * COMMENT MODE
   * ============================================ */
  .devver-comment-mode {
    cursor: crosshair !important;
  }

  .devver-comment-mode * {
    cursor: crosshair !important;
  }

  .devver-comment-mode-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(255, 255, 255, 0.15);
    z-index: 9995;
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--devver-transition-slow);
  }

  .devver-comment-mode-backdrop.visible {
    opacity: 1;
  }

  /* ============================================
   * COMMENT DRAWER (Right slide-in panel)
   * ============================================ */
  .devver-comment-drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--devver-transition-slow);
    z-index: 9996;
  }

  .devver-comment-drawer-backdrop-visible {
    opacity: 1;
    pointer-events: all;
  }

  .devver-comment-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 380px;
    max-width: calc(100vw - 20px);
    background: var(--devver-bg-card);
    border-left: 1px solid var(--devver-border);
    box-shadow: -8px 0 40px rgba(0, 0, 0, 0.4);
    z-index: 9997;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    pointer-events: none;
    transition: transform var(--devver-transition-slow);
    color: var(--devver-text);
  }

  .devver-comment-drawer-open {
    pointer-events: all;
    transform: translateX(0);
  }

  .devver-comment-drawer-header {
    padding: 18px 20px;
    font-weight: 600;
    font-size: 14px;
    border-bottom: 1px solid var(--devver-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: var(--devver-font);
  }

  .devver-comment-drawer-close {
    background: none;
    border: none;
    color: var(--devver-text-muted);
    font-size: 20px;
    cursor: pointer;
    padding: 4px;
    margin: -4px;
    border-radius: var(--devver-radius);
    transition: all var(--devver-transition);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .devver-comment-drawer-close:hover {
    background: var(--devver-bg-elevated);
    color: var(--devver-text);
  }

  .devver-comment-drawer-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .devver-comment-drawer-item {
    text-align: left;
    border: 1px solid var(--devver-border);
    border-radius: var(--devver-radius);
    padding: 14px 16px;
    background: var(--devver-bg-dark);
    cursor: pointer;
    transition: all var(--devver-transition);
    font-family: var(--devver-font);
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .devver-comment-drawer-item:hover {
    background: var(--devver-bg-elevated);
    border-color: var(--devver-border-hover);
  }

  .devver-comment-drawer-num {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    background: var(--devver-pin);
    color: white;
    font-size: 11px;
    font-weight: 700;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .devver-comment-drawer-content {
    flex: 1;
    min-width: 0;
  }

  .devver-comment-drawer-title {
    font-weight: 600;
    font-size: 13px;
    color: var(--devver-text);
    margin-bottom: 4px;
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .devver-comment-drawer-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .devver-comment-drawer-author {
    font-weight: 600;
    font-size: 12px;
    color: var(--devver-text);
  }

  .devver-comment-drawer-date {
    font-size: 11px;
    color: var(--devver-text-muted);
  }

  .devver-comment-drawer-text {
    font-size: 12px;
    color: var(--devver-text-secondary);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .devver-comment-drawer-empty {
    color: var(--devver-text-muted);
    font-size: 13px;
    text-align: center;
    padding: 40px 20px;
    font-family: var(--devver-font);
  }

  /* ============================================
   * SETTINGS PANEL (Right slide-in drawer)
   * ============================================ */
  .devver-settings-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--devver-transition-slow);
    z-index: 9998;
  }

  .devver-settings-backdrop.visible {
    opacity: 1;
    pointer-events: all;
  }

  .devver-settings {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 340px;
    max-width: calc(100vw - 20px);
    background: var(--devver-bg-card);
    border-left: 1px solid var(--devver-border);
    box-shadow: -8px 0 40px rgba(0, 0, 0, 0.4);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    pointer-events: none;
    transition: transform var(--devver-transition-slow);
    color: var(--devver-text);
    font-family: var(--devver-font);
  }

  .devver-settings.open {
    pointer-events: all;
    transform: translateX(0);
  }

  .devver-settings-header {
    padding: 18px 20px;
    border-bottom: 1px solid var(--devver-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .devver-settings-title {
    font-weight: 600;
    font-size: 14px;
    color: var(--devver-text);
  }

  .devver-settings-close {
    background: none;
    border: none;
    color: var(--devver-text-muted);
    font-size: 18px;
    cursor: pointer;
    padding: 4px;
    margin: -4px;
    border-radius: var(--devver-radius);
    transition: all var(--devver-transition);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .devver-settings-close:hover {
    background: var(--devver-bg-elevated);
    color: var(--devver-text);
  }

  .devver-settings-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .devver-settings-field {
    margin-bottom: 0;
  }

  .devver-settings-label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: var(--devver-text-secondary);
    margin-bottom: 6px;
  }

  .devver-settings-input {
    width: 100%;
    padding: 10px 12px;
    background: var(--devver-bg-dark);
    border: 1px solid var(--devver-border);
    border-radius: var(--devver-radius);
    color: var(--devver-text);
    font-size: 14px;
    font-family: var(--devver-font);
    transition: all var(--devver-transition);
    box-sizing: border-box;
  }

  .devver-settings-input::placeholder {
    color: var(--devver-text-muted);
  }

  .devver-settings-input:focus {
    outline: none;
    border-color: var(--devver-accent);
    box-shadow: 0 0 0 3px var(--devver-accent-glow);
  }

  .devver-settings-save {
    width: 100%;
    margin-top: 16px;
    padding: 10px 16px;
    background: var(--devver-accent);
    color: var(--devver-bg-dark);
    border: none;
    border-radius: var(--devver-radius);
    font-size: 13px;
    font-weight: 600;
    font-family: var(--devver-font);
    cursor: pointer;
    transition: all var(--devver-transition);
  }

  .devver-settings-save:hover {
    background: var(--devver-accent-light);
  }

  .devver-settings-field-position {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--devver-border);
  }

  .devver-settings-position-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .devver-settings-position-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--devver-bg-dark);
    border: 1px solid var(--devver-border);
    border-radius: var(--devver-radius);
    cursor: pointer;
    transition: all var(--devver-transition);
    font-size: 13px;
    color: var(--devver-text-secondary);
  }

  .devver-settings-position-option:hover {
    background: var(--devver-bg-elevated);
    border-color: var(--devver-border-hover);
  }

  .devver-settings-position-option.selected {
    background: var(--devver-bg-elevated);
    border-color: var(--devver-accent);
    color: var(--devver-text);
  }

  .devver-settings-position-option input[type="radio"] {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .devver-settings-position-radio {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid var(--devver-border);
    background: transparent;
    transition: all var(--devver-transition);
    position: relative;
    flex-shrink: 0;
  }

  .devver-settings-position-option.selected .devver-settings-position-radio {
    border-color: var(--devver-accent);
  }

  .devver-settings-position-option.selected .devver-settings-position-radio::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--devver-accent);
  }

  /* ============================================
   * RESPONSIVE
   * ============================================ */
  @media (max-width: 640px) {
    .devver-toolbar {
      bottom: 16px;
      padding: 4px;
    }

    .devver-toolbar-btn {
      width: 36px;
      height: 36px;
      font-size: 16px;
    }

    .devver-overlay-modal-anchored {
      max-width: calc(100vw - 32px);
      min-width: auto;
    }

    .devver-comment-drawer {
      width: calc(100vw - 60px);
    }

    .devver-settings {
      width: calc(100vw - 60px);
    }

    .devver-comment-editor {
      width: calc(100vw - 32px);
      max-width: 320px;
    }
  }

  /* ============================================
   * REDUCED MOTION
   * ============================================ */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
  function injectStyles() {
    if (injected) return;
    const style = document.createElement("style");
    style.id = "devver-overlay-styles";
    style.textContent = css;
    document.head.appendChild(style);
    injected = true;
  }
  class Toolbar {
    toolbar = null;
    buttons = /* @__PURE__ */ new Map();
    position = "bottom-center";
    constructor() {
      this.create();
    }
    /**
     * Create the toolbar element
     */
    create() {
      this.toolbar = document.createElement("div");
      this.toolbar.className = "devver-toolbar";
      this.toolbar.dataset.devverCommentUi = "true";
      document.body.appendChild(this.toolbar);
    }
    /**
     * Set the toolbar position
     */
    setPosition(position) {
      if (!this.toolbar) return;
      this.position = position;
      this.toolbar.classList.remove(
        "devver-toolbar-bottom-left",
        "devver-toolbar-bottom-center",
        "devver-toolbar-bottom-right"
      );
      this.toolbar.classList.add(`devver-toolbar-${position}`);
    }
    /**
     * Get current toolbar position
     */
    getPosition() {
      return this.position;
    }
    /**
     * Set toolbar buttons
     */
    setButtons(buttons) {
      if (!this.toolbar) return;
      this.toolbar.innerHTML = "";
      this.buttons.clear();
      buttons.forEach((btn, index) => {
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
    createButton(config) {
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
    setActive(id, active) {
      const button = this.buttons.get(id);
      if (button) {
        button.classList.toggle("active", active);
      }
    }
    /**
     * Update button badge
     */
    setBadge(id, count) {
      const button = this.buttons.get(id);
      if (!button) return;
      const existingBadge = button.querySelector(".devver-toolbar-badge");
      existingBadge?.remove();
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
    setDrawerOpen(isOpen) {
      this.toolbar?.classList.toggle("devver-toolbar-drawer-open", isOpen);
    }
    /**
     * Destroy the toolbar
     */
    destroy() {
      this.toolbar?.remove();
      this.toolbar = null;
      this.buttons.clear();
    }
  }
  class CommentLayer {
    layer;
    previewPin = null;
    constructor() {
      this.layer = document.createElement("div");
      this.layer.className = "devver-comment-layer";
      this.layer.dataset.devverCommentUi = "true";
      document.body.appendChild(this.layer);
    }
    /**
     * Render all comment pins
     */
    render(items, onPinClick) {
      const existingPreview = this.previewPin;
      this.layer.innerHTML = "";
      items.forEach((item) => {
        const pin = this.createPin(item, onPinClick);
        this.layer.appendChild(pin);
      });
      if (existingPreview && this.previewPin) {
        this.layer.appendChild(existingPreview);
      }
    }
    /**
     * Show a preview pin at the specified position
     */
    showPreviewPin(x, y, index) {
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
    removePreviewPin() {
      this.previewPin?.remove();
      this.previewPin = null;
    }
    /**
     * Create a single pin element
     */
    createPin(item, onPinClick) {
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
  function escapeHtml$1(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  class CommentEditor {
    editor = null;
    /**
     * Open the editor at specified position
     */
    open(options) {
      this.close();
      const editor = document.createElement("div");
      editor.className = "devver-comment-editor";
      editor.dataset.devverCommentUi = "true";
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
            <span class="devver-comment-editor-author-name">${escapeHtml$1(options.authorName)}</span>
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
      const handleCancel = () => {
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
        const submitBtn = editor.querySelector(".devver-comment-editor-submit");
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "...";
        }
        await options.onSubmit(value);
        this.close();
      });
      document.body.appendChild(editor);
      this.editor = editor;
      requestAnimationFrame(() => {
        textarea?.focus();
      });
    }
    /**
     * Update the displayed author name
     */
    updateAuthorName(name) {
      const nameEl = this.editor?.querySelector(".devver-comment-editor-author-name");
      if (nameEl) {
        nameEl.textContent = name;
      }
    }
    /**
     * Close and remove the editor
     */
    close() {
      this.editor?.remove();
      this.editor = null;
    }
    /**
     * Check if editor is currently open
     */
    isOpen() {
      return this.editor !== null;
    }
  }
  function escapeHtml(value) {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function isCommentUi(target) {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest('[data-devver-comment-ui="true"]') || target.closest(".devver-overlay")
    );
  }
  function formatDateShort(dateStr) {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "";
    }
  }
  class CommentDrawer {
    drawer = null;
    backdrop = null;
    isOpenState = false;
    onCloseCallback = null;
    /**
     * Open the drawer with a list of comments
     */
    open(comments, onSelect) {
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
    close() {
      this.drawer?.classList.remove("devver-comment-drawer-open");
      this.backdrop?.classList.remove("devver-comment-drawer-backdrop-visible");
      this.isOpenState = false;
    }
    /**
     * Toggle the drawer open/closed
     */
    toggle(comments, onSelect) {
      if (this.isOpenState) {
        this.close();
      } else {
        this.open(comments, onSelect);
      }
    }
    /**
     * Check if drawer is open
     */
    isOpen() {
      return this.isOpenState;
    }
    /**
     * Set close handler (called when drawer is closed via backdrop)
     */
    setOnClose(handler) {
      this.onCloseCallback = handler;
    }
    /**
     * Create the drawer DOM elements
     */
    createDrawer() {
      this.backdrop = document.createElement("div");
      this.backdrop.className = "devver-comment-drawer-backdrop";
      this.backdrop.dataset.devverCommentUi = "true";
      this.backdrop.addEventListener("click", () => {
        this.close();
        this.onCloseCallback?.();
      });
      document.body.appendChild(this.backdrop);
      this.drawer = document.createElement("div");
      this.drawer.className = "devver-comment-drawer";
      this.drawer.dataset.devverCommentUi = "true";
      document.body.appendChild(this.drawer);
    }
    /**
     * Render the list of comments
     */
    renderList(comments, onSelect) {
      if (!this.drawer) return;
      const count = comments.length;
      const countText = count === 0 ? "Aucun commentaire" : count === 1 ? "1 commentaire" : `${count} commentaires`;
      const list = comments.map((comment, index) => {
        const num = index + 1;
        const author = escapeHtml(comment.author || "Anonyme");
        const date = formatDateShort(comment.createdAt);
        const text = escapeHtml(
          comment.text.length > 60 ? `${comment.text.slice(0, 57)}...` : comment.text
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
      }).join("");
      this.drawer.innerHTML = `
      <div class="devver-comment-drawer-header">
        <span>${countText}</span>
        <button class="devver-comment-drawer-close" aria-label="Fermer">×</button>
      </div>
      <div class="devver-comment-drawer-list">
        ${count > 0 ? list : '<div class="devver-comment-drawer-empty">Aucun commentaire sur cette page</div>'}
      </div>
    `;
      const closeBtn = this.drawer.querySelector(".devver-comment-drawer-close");
      closeBtn?.addEventListener("click", () => this.close());
      const items = this.drawer.querySelectorAll(".devver-comment-drawer-item");
      items.forEach((el) => {
        el.addEventListener("click", () => {
          const id = el.dataset.id;
          const found = comments.find((c) => c.id === id);
          if (found) {
            onSelect(found);
            this.close();
          }
        });
      });
    }
  }
  const globalScope = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : {};
  function getScrollPosition() {
    return {
      x: globalScope.scrollX ?? 0,
      y: globalScope.scrollY ?? 0
    };
  }
  function getViewportSize() {
    return {
      width: globalScope.innerWidth ?? 800,
      height: globalScope.innerHeight ?? 600
    };
  }
  function getPageUrl() {
    return globalScope.location?.href.split("#")[0] ?? "";
  }
  function scrollTo(x, y) {
    try {
      globalScope.scrollTo?.({ top: y, left: x, behavior: "smooth" });
    } catch {
    }
  }
  const DEFAULT_MODAL_DIMENSIONS = {
    width: 320,
    height: 200
  };
  const MARGIN = 20;
  function calculateModalPosition(anchor, dimensions = DEFAULT_MODAL_DIMENSIONS) {
    const viewport = getViewportSize();
    const { width: modalWidth, height: modalHeight } = dimensions;
    let left = anchor.anchorX + MARGIN;
    if (left + modalWidth > viewport.width - MARGIN) {
      left = anchor.anchorX - modalWidth - MARGIN;
    }
    left = Math.max(MARGIN, Math.min(left, viewport.width - modalWidth - MARGIN));
    let top = anchor.anchorY - MARGIN;
    if (top + modalHeight > viewport.height - MARGIN) {
      top = viewport.height - modalHeight - MARGIN;
    }
    top = Math.max(MARGIN, top);
    return { left, top };
  }
  function isInViewport(x, y, margin = 50) {
    const viewport = getViewportSize();
    return x >= margin && x <= viewport.width - margin && y >= margin && y <= viewport.height - margin;
  }
  function calculateScrollTarget(absoluteX, absoluteY) {
    const viewport = getViewportSize();
    return {
      x: Math.max(absoluteX - viewport.width / 3, 0),
      y: Math.max(absoluteY - viewport.height / 3, 0)
    };
  }
  class Modal {
    overlay = null;
    options = {};
    /**
     * Show the modal with given options
     */
    show(options = {}) {
      this.options = {
        title: options.title || "",
        content: options.content || "",
        closeOnClickOutside: options.closeOnClickOutside ?? true,
        showCloseButton: options.showCloseButton ?? true,
        onClose: options.onClose,
        className: options.className || "",
        anchorX: options.anchorX,
        anchorY: options.anchorY,
        showBackdrop: options.showBackdrop ?? true
      };
      if (this.overlay) {
        this.closeImmediate();
      }
      this.createOverlay();
    }
    /**
     * Close the modal with animation
     */
    close() {
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
    closeImmediate() {
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
    }
    /**
     * Check if modal is currently open
     */
    isOpen() {
      return this.overlay !== null;
    }
    /**
     * Create the overlay DOM structure
     */
    createOverlay() {
      this.overlay = document.createElement("div");
      this.overlay.className = "devver-overlay";
      this.overlay.dataset.devverCommentUi = "true";
      if (this.options.className) {
        this.overlay.classList.add(this.options.className);
      }
      if (this.options.showBackdrop) {
        const backdrop = this.createBackdrop();
        this.overlay.appendChild(backdrop);
      } else if (this.options.closeOnClickOutside) {
        const clickCatcher = document.createElement("div");
        clickCatcher.style.cssText = "position:absolute;inset:0;";
        clickCatcher.addEventListener("click", () => this.close());
        this.overlay.appendChild(clickCatcher);
      }
      const modal = this.createModal();
      this.overlay.appendChild(modal);
      document.body.appendChild(this.overlay);
      requestAnimationFrame(() => {
        this.overlay?.classList.add("devver-overlay-active");
      });
    }
    /**
     * Create the backdrop element
     */
    createBackdrop() {
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
    createModal() {
      const modal = document.createElement("div");
      modal.className = "devver-overlay-modal";
      modal.addEventListener("click", (e) => e.stopPropagation());
      this.applyAnchorPosition(modal);
      if (this.options.title || this.options.showCloseButton) {
        modal.appendChild(this.createHeader());
      }
      if (this.options.content) {
        modal.appendChild(this.createBody());
      }
      return modal;
    }
    /**
     * Apply anchor-based positioning to modal
     */
    applyAnchorPosition(modal) {
      if (this.options.anchorX === void 0 || this.options.anchorY === void 0) {
        return;
      }
      modal.classList.add("devver-overlay-modal-anchored");
      const position = calculateModalPosition({
        anchorX: this.options.anchorX,
        anchorY: this.options.anchorY
      });
      modal.style.left = `${position.left}px`;
      modal.style.top = `${position.top}px`;
    }
    /**
     * Create the modal header
     */
    createHeader() {
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
    createBody() {
      const body = document.createElement("div");
      body.className = "devver-overlay-body";
      if (typeof this.options.content === "string") {
        body.innerHTML = this.options.content;
      }
      return body;
    }
  }
  const STORAGE_KEY = "devver-overlay-author";
  const POSITION_STORAGE_KEY = "devver-overlay-toolbar-position";
  class SettingsPanel {
    panel = null;
    backdrop = null;
    isOpenState = false;
    onChange = null;
    onPositionChange = null;
    onCloseCallback = null;
    constructor() {
      this.create();
    }
    /**
     * Create the settings panel element
     */
    create() {
      this.backdrop = document.createElement("div");
      this.backdrop.className = "devver-settings-backdrop";
      this.backdrop.dataset.devverCommentUi = "true";
      this.backdrop.addEventListener("click", () => {
        this.close();
        this.onCloseCallback?.();
      });
      document.body.appendChild(this.backdrop);
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
      const closeBtn = this.panel.querySelector(".devver-settings-close");
      closeBtn?.addEventListener("click", () => this.close());
      const positionOptions = this.panel.querySelectorAll(".devver-settings-position-option");
      positionOptions.forEach((option) => {
        const radio = option.querySelector("input[type='radio']");
        radio?.addEventListener("change", () => {
          positionOptions.forEach((opt) => opt.classList.remove("selected"));
          option.classList.add("selected");
        });
      });
      const saveBtn = this.panel.querySelector(".devver-settings-save");
      const input = this.panel.querySelector("#devver-author-name");
      saveBtn?.addEventListener("click", () => {
        const value = input?.value.trim() || "";
        this.saveAuthorName(value);
        this.onChange?.(value || "Anonyme");
        const selectedPosition = this.panel?.querySelector("input[name='toolbar-position']:checked");
        if (selectedPosition) {
          const position = selectedPosition.value;
          this.saveToolbarPosition(position);
          this.onPositionChange?.(position);
        }
        this.close();
      });
      input?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          saveBtn?.click();
        }
      });
      document.body.appendChild(this.panel);
    }
    /**
     * Escape HTML attribute value
     */
    escapeAttr(value) {
      return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    /**
     * Set change handler for author name
     */
    setOnChange(handler) {
      this.onChange = handler;
    }
    /**
     * Set change handler for toolbar position
     */
    setOnPositionChange(handler) {
      this.onPositionChange = handler;
    }
    /**
     * Set close handler (called when panel is closed)
     */
    setOnClose(handler) {
      this.onCloseCallback = handler;
    }
    /**
     * Open the settings panel
     */
    open() {
      const input = this.panel?.querySelector("#devver-author-name");
      if (input) {
        input.value = this.getSavedAuthorName();
      }
      const savedPosition = this.getSavedToolbarPosition();
      const positionOptions = this.panel?.querySelectorAll(".devver-settings-position-option");
      positionOptions?.forEach((option) => {
        const radio = option.querySelector("input[type='radio']");
        if (radio) {
          radio.checked = radio.value === savedPosition;
          option.classList.toggle("selected", radio.value === savedPosition);
        }
      });
      this.backdrop?.classList.add("visible");
      this.panel?.classList.add("open");
      this.isOpenState = true;
      setTimeout(() => input?.focus(), 250);
    }
    /**
     * Close the settings panel
     */
    close() {
      this.backdrop?.classList.remove("visible");
      this.panel?.classList.remove("open");
      this.isOpenState = false;
    }
    /**
     * Toggle the panel open/closed
     */
    toggle() {
      if (this.isOpenState) {
        this.close();
      } else {
        this.open();
      }
    }
    /**
     * Check if panel is open
     */
    isOpen() {
      return this.isOpenState;
    }
    /**
     * Get saved author name from localStorage
     */
    getSavedAuthorName() {
      try {
        return localStorage.getItem(STORAGE_KEY) || "";
      } catch {
        return "";
      }
    }
    /**
     * Save author name to localStorage
     */
    saveAuthorName(name) {
      try {
        if (name) {
          localStorage.setItem(STORAGE_KEY, name);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
      }
    }
    /**
     * Get current author name (saved or default)
     */
    getAuthorName() {
      return this.getSavedAuthorName() || "Anonyme";
    }
    /**
     * Get saved toolbar position from localStorage
     */
    getSavedToolbarPosition() {
      try {
        const saved = localStorage.getItem(POSITION_STORAGE_KEY);
        if (saved && ["bottom-left", "bottom-center", "bottom-right"].includes(saved)) {
          return saved;
        }
      } catch {
      }
      return "bottom-center";
    }
    /**
     * Save toolbar position to localStorage
     */
    saveToolbarPosition(position) {
      try {
        localStorage.setItem(POSITION_STORAGE_KEY, position);
      } catch {
      }
    }
    /**
     * Get current toolbar position
     */
    getToolbarPosition() {
      return this.getSavedToolbarPosition();
    }
  }
  const SAFE_ATTRS = ["data-testid", "data-id", "data-name"];
  function escapeCss(value) {
    if (typeof CSS !== "undefined" && CSS.escape) {
      return CSS.escape(value);
    }
    return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }
  function clamp01(value) {
    if (value === void 0 || Number.isNaN(value)) return void 0;
    return Math.min(1, Math.max(0, value));
  }
  function generateSelector(element) {
    if (element.id) {
      return `#${escapeCss(element.id)}`;
    }
    for (const attr of SAFE_ATTRS) {
      const val = element.getAttribute(attr);
      if (val) {
        return `[${attr}="${escapeCss(val)}"]`;
      }
    }
    const parts = [];
    let el = element;
    let depth = 0;
    while (el && depth < 4) {
      const tag = el.tagName.toLowerCase();
      const parent = el.parentElement;
      let selector = tag;
      if (parent) {
        const siblings = Array.from(parent.children).filter((sib) => {
          return sib instanceof HTMLElement && el !== null && sib.tagName === el.tagName;
        });
        if (siblings.length > 1 && parent instanceof HTMLElement) {
          const index = siblings.indexOf(el) + 1;
          selector = `${tag}:nth-of-type(${index})`;
        }
      }
      parts.unshift(selector);
      el = parent;
      depth += 1;
    }
    return parts.join(" > ") || void 0;
  }
  function buildAnchorData(event) {
    const pageX = event.pageX;
    const pageY = event.pageY;
    const doc = document.documentElement;
    const normX = doc.scrollWidth ? pageX / doc.scrollWidth : void 0;
    const normY = doc.scrollHeight ? pageY / doc.scrollHeight : void 0;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target || isCommentUi(target)) {
      return { pageX, pageY, normX, normY };
    }
    const selector = generateSelector(target);
    const rect = target.getBoundingClientRect();
    const offsetX = clamp01(rect.width ? (event.clientX - rect.left) / rect.width : void 0);
    const offsetY = clamp01(rect.height ? (event.clientY - rect.top) / rect.height : void 0);
    return {
      pageX,
      pageY,
      normX,
      normY,
      anchorSelector: selector,
      anchorOffsetX: offsetX,
      anchorOffsetY: offsetY
    };
  }
  function resolveAbsoluteX(item, docWidth) {
    const scroll = getScrollPosition();
    if (item.anchorSelector && item.anchorOffsetX !== void 0) {
      const el = document.querySelector(item.anchorSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width) {
          return rect.left + rect.width * item.anchorOffsetX + scroll.x;
        }
      }
    }
    if (item.normX !== void 0 && docWidth) {
      return item.normX * docWidth;
    }
    return item.x;
  }
  function resolveAbsoluteY(item, docHeight) {
    const scroll = getScrollPosition();
    if (item.anchorSelector && item.anchorOffsetY !== void 0) {
      const el = document.querySelector(item.anchorSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.height) {
          return rect.top + rect.height * item.anchorOffsetY + scroll.y;
        }
      }
    }
    if (item.normY !== void 0 && docHeight) {
      return item.normY * docHeight;
    }
    return item.y;
  }
  function resolveAbsolutePosition(item) {
    const doc = document.documentElement;
    return {
      x: resolveAbsoluteX(item, doc.scrollWidth),
      y: resolveAbsoluteY(item, doc.scrollHeight)
    };
  }
  const ICONS = {
    comment: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
    list: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
    settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
  };
  const DEFAULT_CONFIG = {
    position: "bottom-right",
    showButton: true,
    authorName: "Anonyme"
  };
  function formatDate(dateStr) {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  }
  class DevverOverlay {
    // Configuration
    config;
    commentConfig = { mode: "local" };
    // State
    commentMode = false;
    comments = [];
    renderScheduled = false;
    pageUrl;
    authorName;
    // Services
    commentService;
    // UI Components
    modal;
    toolbar;
    commentLayer;
    commentEditor;
    commentDrawer;
    settingsPanel;
    commentModeBackdrop = null;
    // Event handlers (bound for cleanup)
    handleScroll = () => this.scheduleRender();
    handleResize = () => this.scheduleRender();
    constructor(config = {}) {
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.pageUrl = getPageUrl();
      this.commentService = new CommentService(this.commentConfig, this.pageUrl);
      this.modal = new Modal();
      this.commentLayer = new CommentLayer();
      this.commentEditor = new CommentEditor();
      this.commentDrawer = new CommentDrawer();
      this.settingsPanel = new SettingsPanel();
      this.authorName = this.settingsPanel.getAuthorName() || this.config.authorName;
      this.settingsPanel.setOnChange((name) => {
        this.authorName = name;
        this.commentEditor.updateAuthorName(name);
      });
      this.settingsPanel.setOnPositionChange((position) => {
        this.toolbar?.setPosition(position);
      });
      this.settingsPanel.setOnClose(() => {
        this.updateToolbarState();
      });
      this.commentDrawer.setOnClose(() => {
        this.updateToolbarState();
      });
      this.toolbar = this.config.showButton ? this.createToolbar() : null;
      if (this.toolbar) {
        const savedPosition = this.settingsPanel.getToolbarPosition();
        this.toolbar.setPosition(savedPosition);
      }
      this.createCommentModeBackdrop();
      this.setup();
    }
    // ============================================
    // SETUP & INITIALIZATION
    // ============================================
    /**
     * Setup event listeners and inject styles
     */
    setup() {
      injectStyles();
      document.addEventListener("click", this.handleCommentClick, true);
      document.addEventListener("keydown", this.handleEscape);
      globalScope.addEventListener?.("scroll", this.handleScroll, { passive: true });
      globalScope.addEventListener?.("resize", this.handleResize, { passive: true });
      void this.loadComments();
    }
    /**
     * Load comments from service
     */
    async loadComments() {
      this.comments = await this.commentService.fetchComments();
      this.renderComments();
      this.updateToolbarBadge();
    }
    /**
     * Create the comment mode backdrop element
     */
    createCommentModeBackdrop() {
      this.commentModeBackdrop = document.createElement("div");
      this.commentModeBackdrop.className = "devver-comment-mode-backdrop";
      this.commentModeBackdrop.dataset.devverCommentUi = "true";
      document.body.appendChild(this.commentModeBackdrop);
    }
    // ============================================
    // TOOLBAR
    // ============================================
    /**
     * Create the toolbar with buttons
     */
    createToolbar() {
      const toolbar = new Toolbar();
      toolbar.setButtons([
        {
          id: "comment",
          icon: ICONS.comment,
          label: "Mode commentaire",
          onClick: () => this.toggleCommentMode()
        },
        {
          id: "list",
          icon: ICONS.list,
          label: "Liste des commentaires",
          onClick: () => this.toggleDrawer(),
          badge: this.comments.length
        },
        {
          id: "settings",
          icon: ICONS.settings,
          label: "Paramètres",
          onClick: () => this.toggleSettings()
        }
      ]);
      return toolbar;
    }
    /**
     * Update toolbar button states
     */
    updateToolbarState() {
      this.toolbar?.setActive("comment", this.commentMode);
      this.toolbar?.setActive("list", this.commentDrawer.isOpen());
      this.toolbar?.setActive("settings", this.settingsPanel.isOpen());
      const drawerOpen = this.commentDrawer.isOpen() || this.settingsPanel.isOpen();
      this.toolbar?.setDrawerOpen(drawerOpen);
    }
    /**
     * Update toolbar badge with comment count
     */
    updateToolbarBadge() {
      this.toolbar?.setBadge("list", this.comments.length);
    }
    // ============================================
    // RENDERING
    // ============================================
    /**
     * Schedule a render on the next animation frame
     * Prevents multiple renders in the same frame
     */
    scheduleRender() {
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
    renderComments() {
      const scroll = getScrollPosition();
      const pins = this.comments.map((comment, index) => {
        const pos = resolveAbsolutePosition(comment);
        return {
          comment,
          x: pos.x - scroll.x,
          y: pos.y - scroll.y,
          index: index + 1
        };
      });
      this.commentLayer.render(pins, (comment) => this.focusComment(comment));
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
    toggleCommentMode() {
      if (this.commentMode) {
        this.disableComments();
      } else {
        this.enableComments();
      }
    }
    /**
     * Enable comment mode
     */
    enableComments(config) {
      if (config) {
        this.configureComments(config);
      }
      this.settingsPanel.close();
      this.commentDrawer.close();
      this.commentMode = true;
      document.body.classList.add("devver-comment-mode");
      this.commentModeBackdrop?.classList.add("visible");
      this.updateToolbarState();
    }
    /**
     * Disable comment mode
     */
    disableComments() {
      this.commentMode = false;
      this.updateToolbarState();
      this.commentEditor.close();
      this.commentLayer.removePreviewPin();
      document.body.classList.remove("devver-comment-mode");
      this.commentModeBackdrop?.classList.remove("visible");
    }
    /**
     * Disable comment mode visuals only (cursor, backdrop)
     * Used when placing a pin but editor is still open
     */
    disableCommentModeVisuals() {
      this.commentMode = false;
      this.updateToolbarState();
      document.body.classList.remove("devver-comment-mode");
      this.commentModeBackdrop?.classList.remove("visible");
    }
    /**
     * Configure the comment service
     */
    configureComments(config) {
      this.commentConfig = { ...this.commentConfig, ...config };
      this.commentService.updateConfig(this.commentConfig);
      void this.loadComments();
    }
    /**
     * Get list of all comments
     */
    listComments() {
      return [...this.comments];
    }
    /**
     * Set author name for new comments
     */
    setAuthorName(name) {
      this.authorName = name;
    }
    // ============================================
    // SETTINGS
    // ============================================
    /**
     * Toggle settings panel
     */
    toggleSettings() {
      if (this.settingsPanel.isOpen()) {
        this.settingsPanel.close();
      } else {
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
    handleCommentClick = (e) => {
      if (!this.commentMode) return;
      if (isCommentUi(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      const anchor = buildAnchorData(e);
      const previewIndex = this.comments.length + 1;
      this.commentLayer.showPreviewPin(e.clientX, e.clientY, previewIndex);
      this.disableCommentModeVisuals();
      this.openCommentEditor(e.clientX, e.clientY, anchor);
    };
    /**
     * Handle escape key
     */
    handleEscape = (e) => {
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
    openCommentEditor(clientX, clientY, anchor) {
      this.commentEditor.open({
        x: clientX,
        y: clientY,
        authorName: this.authorName,
        onSubmit: async (text) => {
          this.commentLayer.removePreviewPin();
          await this.saveComment(text, anchor);
        },
        onCancel: () => {
          this.commentLayer.removePreviewPin();
        },
        onChangeAuthor: () => {
          this.settingsPanel.open();
          this.updateToolbarState();
        }
      });
    }
    /**
     * Save a new comment
     */
    async saveComment(text, anchor) {
      const comment = await this.commentService.createComment({
        text,
        x: anchor.pageX,
        y: anchor.pageY,
        pageUrl: this.pageUrl,
        normX: anchor.normX,
        normY: anchor.normY,
        anchorSelector: anchor.anchorSelector,
        anchorOffsetX: anchor.anchorOffsetX,
        anchorOffsetY: anchor.anchorOffsetY
      }, this.authorName);
      this.comments = [...this.comments, comment];
      this.scheduleRender();
      this.updateToolbarBadge();
    }
    /**
     * Focus on a specific comment (scroll to it and show modal)
     */
    focusComment(comment) {
      const pos = resolveAbsolutePosition(comment);
      const scroll = getScrollPosition();
      const viewportX = pos.x - scroll.x;
      const viewportY = pos.y - scroll.y;
      if (!isInViewport(viewportX, viewportY)) {
        const target = calculateScrollTarget(pos.x, pos.y);
        scrollTo(target.x, target.y);
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
    showCommentModal(comment, anchorX, anchorY) {
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
        anchorY
      });
    }
    // ============================================
    // DRAWER
    // ============================================
    /**
     * Toggle the comment drawer
     */
    toggleDrawer() {
      if (this.commentDrawer.isOpen()) {
        this.commentDrawer.close();
      } else {
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
    show(options = {}) {
      this.modal.show(options);
    }
    /**
     * Close the modal
     */
    close() {
      this.modal.close();
    }
    /**
     * Check if modal is open
     */
    isOpen() {
      return this.modal.isOpen();
    }
  }
  const devverOverlay = new DevverOverlay();
  const api = {
    /**
     * Show a modal overlay
     * @param options - Modal configuration options
     */
    show: (options) => devverOverlay.show(options),
    /**
     * Close the current modal
     */
    close: () => devverOverlay.close(),
    /**
     * Check if a modal is currently open
     */
    isOpen: () => devverOverlay.isOpen(),
    /**
     * Enable comment mode
     * @param config - Optional API configuration for comments
     */
    enableComments: (config) => devverOverlay.enableComments(config),
    /**
     * Disable comment mode
     */
    disableComments: () => devverOverlay.disableComments(),
    /**
     * Configure the comment service
     * @param config - API configuration for comments
     */
    configureComments: (config) => devverOverlay.configureComments(config),
    /**
     * Get all comments for the current page
     */
    listComments: () => devverOverlay.listComments(),
    /**
     * Set the author name for new comments
     * @param name - The author name to use
     */
    setAuthorName: (name) => devverOverlay.setAuthorName(name)
  };
  globalScope.DevverOverlay = api;
  exports.DevverOverlay = DevverOverlay;
  exports.default = devverOverlay;
  Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
})((typeof globalThis!=="undefined"?globalThis:typeof window!=="undefined"?window:typeof self!=="undefined"?self:{}).DevverOverlay = (typeof globalThis!=="undefined"?globalThis:typeof window!=="undefined"?window:typeof self!=="undefined"?self:{}).DevverOverlay || {});
//# sourceMappingURL=devver-overlay.iife.js.map
