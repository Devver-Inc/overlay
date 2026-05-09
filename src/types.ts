export interface OverlayOptions {
  title?: string;
  content?: string;
  closeOnClickOutside?: boolean;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
  /** Position the modal near a specific point (viewport coordinates) */
  anchorX?: number;
  anchorY?: number;
  /** Show backdrop behind modal (default: true) */
  showBackdrop?: boolean;
}

export interface OverlayAccessControl {
  commentPermission: "email_required" | "team_only";
}

export interface LogtoAuthConfig {
  endpoint?: string;
  appId?: string;
  redirectUri?: string;
  postLogoutRedirectUri?: string;
  apiResource?: string;
  scopes?: string[];
  resources?: string[];
}

export interface DevverScriptConfig {
  projectId: string;
  organizationId: string;
  repo?: string;
  branch?: string;
  apiBaseUrl?: string;
  logto?: LogtoAuthConfig;
  overlayAccessControl?: OverlayAccessControl;
}

export interface CommentAuthorConfig {
  /** Default author name for comments */
  authorName?: string;
}

export interface CommentInput {
  text: string;
  x: number;
  y: number;
  pageUrl: string;
  normX?: number;
  normY?: number;
  anchorSelector?: string;
  anchorOffsetX?: number;
  anchorOffsetY?: number;
}

export interface CommentItem extends CommentInput {
  id: string;
  createdAt: string;
  author?: string;
}

export interface CommentApiConfig {
  mode?: "local" | "api";
  baseUrl?: string;
  projectId?: string;
  organizationId?: string;
  authToken?: string;
  authTokenProvider?: () => Promise<string | undefined>;
  requiresAuth?: boolean;
  repo?: string;
  branch?: string;
  guestEmail?: string;
  logto?: LogtoAuthConfig;
  overlayAccessControl?: OverlayAccessControl;
}

export interface DevverConfig {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  showButton?: boolean;
  /** Default author name for comments */
  authorName?: string;
}

declare global {
  interface Window {
    __DEVVER__?: DevverScriptConfig;
  }
}

export type DevverOverlayAPI = {
  show: (options?: OverlayOptions) => void;
  close: () => void;
  isOpen: () => boolean;
  enableComments: (config?: CommentApiConfig) => void;
  disableComments: () => void;
  configureComments: (config: CommentApiConfig) => void;
  listComments: () => CommentItem[];
  setAuthorName: (name: string) => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: () => boolean;
};
