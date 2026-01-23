import type { CommentApiConfig, CommentInput, CommentItem } from "../types";

export class CommentService {
  private pageUrl: string;
  private config: CommentApiConfig;

  constructor(config: CommentApiConfig = {}, pageUrl?: string) {
    this.pageUrl = pageUrl ?? globalThis.location.href.split("#")[0];
    this.config = {
      mode: "local",
      ...config,
    };
  }

  public updateConfig(config: CommentApiConfig): void {
    this.config = { ...this.config, ...config };
  }

  public updatePageUrl(pageUrl: string): void {
    this.pageUrl = pageUrl;
  }

  private get storageKey(): string {
    return `devver-comments:${this.pageUrl}`;
  }

  private shouldUseApi(): boolean {
    return Boolean(
      this.config.mode === "api" &&
        this.config.baseUrl &&
        this.config.projectId
    );
  }

  public async fetchComments(): Promise<CommentItem[]> {
    if (this.shouldUseApi()) {
      try {
        const url = `${this.config.baseUrl}/comments?projectId=${encodeURIComponent(
          this.config.projectId as string
        )}&pageUrl=${encodeURIComponent(this.pageUrl)}`;
        const response = await fetch(url, {
          headers: this.buildHeaders(),
        });

        if (!response.ok) {
          throw new Error(`API error ${response.status}`);
        }

        const data = await response.json();
        if (Array.isArray(data)) {
          return data as CommentItem[];
        }
      } catch (error) {
        console.warn("[DevverOverlay] API fetch failed, falling back to local", error);
      }
    }

    return this.readLocal();
  }

  public async createComment(input: CommentInput, authorName?: string): Promise<CommentItem> {
    const comment: CommentItem = {
      ...input,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      author: authorName || "Anonyme",
    };

    if (this.shouldUseApi()) {
      try {
        const url = `${this.config.baseUrl}/comments`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.buildHeaders(),
          },
          body: JSON.stringify({
            ...comment,
            projectId: this.config.projectId,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error ${response.status}`);
        }

        const data = await response.json();
        return data as CommentItem;
      } catch (error) {
        console.warn("[DevverOverlay] API save failed, using local storage", error);
      }
    }

    const current = this.readLocal();
    const next = [...current, comment];
    this.writeLocal(next);
    return comment;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.config.authToken) {
      headers.Authorization = `Bearer ${this.config.authToken}`;
    }
    return headers;
  }

  private readLocal(): CommentItem[] {
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

  private writeLocal(comments: CommentItem[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(comments));
    } catch (error) {
      console.warn("[DevverOverlay] Unable to persist local comments", error);
    }
  }

  private generateId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `devver-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
