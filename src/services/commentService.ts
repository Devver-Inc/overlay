import type { CommentApiConfig, CommentInput, CommentItem } from "../types";

// Shape returned by GET /api/v1/projects/:id/comments
interface GetCommentDto {
  id: string;
  content: string;
  author: { id: string; name: string } | null;
  repo: string | null;
  branch: string | null;
  position: {
    pageUrl: string;
    anchor: string;
    normX: number;
    normY: number;
    anchorOffsetX: number;
    anchorOffsetY: number;
  } | null;
  createdAt: string | Date;
}

// Shape of a paginated response from the backend
interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
}

function mapDtoToCommentItem(dto: GetCommentDto): CommentItem {
  return {
    id: dto.id,
    text: dto.content,
    author: dto.author?.name ?? "Anonyme",
    createdAt: new Date(dto.createdAt).toISOString(),
    pageUrl: dto.position?.pageUrl ?? "",
    x: 0,
    y: 0,
    normX: dto.position?.normX,
    normY: dto.position?.normY,
    anchorSelector: dto.position?.anchor,
    anchorOffsetX: dto.position?.anchorOffsetX,
    anchorOffsetY: dto.position?.anchorOffsetY,
  };
}

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
        const { baseUrl, projectId, repo, branch } = this.config;
        const params = new URLSearchParams({ disablePagination: "true" });
        if (repo) params.set("repo", repo);
        if (branch) params.set("branch", branch);

        const url = `${baseUrl}/projects/${encodeURIComponent(projectId as string)}/comments?${params.toString()}`;
        const response = await fetch(url, {
          headers: this.buildHeaders(),
        });

        if (!response.ok) {
          throw new Error(`API error ${response.status}`);
        }

        const data = (await response.json()) as PaginatedResponse<GetCommentDto>;
        const allComments = data.data.map(mapDtoToCommentItem);

        // Filter client-side by current pageUrl (backend has no pageUrl filter)
        return allComments.filter((c) => c.pageUrl === this.pageUrl);
      } catch (error) {
        console.warn("[DevverOverlay] API fetch failed, falling back to local", error);
      }
    }

    return this.readLocal();
  }

  public async createComment(input: CommentInput, authorName?: string, guestEmail?: string): Promise<CommentItem> {
    if (this.shouldUseApi()) {
      try {
        const { baseUrl, projectId, repo, branch } = this.config;
        const resolvedEmail = guestEmail ?? this.config.guestEmail;

        const body: Record<string, unknown> = {
          content: input.text,
          ...(repo && { repo }),
          ...(branch && { branch }),
          ...(resolvedEmail && { guestEmail: resolvedEmail }),
        };

        if (
          input.anchorSelector !== undefined &&
          input.normX !== undefined &&
          input.normY !== undefined &&
          input.anchorOffsetX !== undefined &&
          input.anchorOffsetY !== undefined
        ) {
          body.position = {
            pageUrl: input.pageUrl,
            anchor: input.anchorSelector,
            normX: input.normX,
            normY: input.normY,
            anchorOffsetX: input.anchorOffsetX,
            anchorOffsetY: input.anchorOffsetY,
          };
        }

        const url = `${baseUrl}/projects/${encodeURIComponent(projectId as string)}/comments`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.buildHeaders(),
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(`API error ${response.status}`);
        }

        const dto = (await response.json()) as GetCommentDto;
        return mapDtoToCommentItem(dto);
      } catch (error) {
        console.warn("[DevverOverlay] API save failed, using local storage", error);
      }
    }

    const comment: CommentItem = {
      ...input,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      author: authorName || "Anonyme",
    };

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
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed as CommentItem[];
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
