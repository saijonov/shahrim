/**
 * Shared, typed API client for the Shahrim backend. Consumed by the Mini App,
 * admin portal and native app so request/response shapes stay in one place.
 * Endpoints are added phase by phase; Phase 0 ships the transport + health check.
 */

// ---- Domain types (mirror the backend data model, PRD §10) ----

export type IssueStatus =
  | "submitted"
  | "in_review"
  | "in_progress"
  | "resolved"
  | "rejected";

export type Urgency = "low" | "medium" | "high";

export type Role = "citizen" | "admin";

export interface Category {
  code: string;
  name_uz: string;
  icon: string | null;
}

export interface User {
  id: number;
  telegram_id: number | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
  phone: string | null;
  language: string;
  role: Role;
}

export interface Issue {
  id: number;
  user_id: number;
  photo_url: string | null;
  ai_description: string | null;
  user_description: string | null;
  final_description: string | null;
  category_code: string;
  urgency: Urgency | null;
  status: IssueStatus;
  lat: number | null;
  lng: number | null;
  address_text: string | null;
  district: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusHistoryEntry {
  status: IssueStatus;
  note: string | null;
  created_at: string;
}

export interface Resolution {
  result_photo_url: string | null;
  note: string | null;
  resolved_at: string;
}

export interface RatingInfo {
  stars: number;
  comment: string | null;
  created_at: string;
}

export interface IssueDetail extends Issue {
  status_history: StatusHistoryEntry[];
  resolution: Resolution | null;
  rating: RatingInfo | null;
}

// ---- Client ----

export interface ClientOptions {
  baseUrl: string;
  /** Returns the current session token, if any (added in Phase 1). */
  getToken?: () => string | null | undefined;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface UploadResponse {
  photo_url: string;
}

export interface AnalysisResult {
  suggestions: string[];
  category: string;
  urgency: Urgency;
  is_valid_city_issue: boolean;
}

export interface IssueCreate {
  photo_url: string | null;
  user_description: string;
  category_code: string;
  urgency?: Urgency | null;
  lat: number | null;
  lng: number | null;
  address_text?: string | null;
}

export interface ApiClient {
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  health: () => Promise<{ status: string }>;
  /** Validate Telegram Mini App initData server-side and get a session token. */
  authTelegram: (initData: string) => Promise<AuthResponse>;
  /** Current authenticated user (requires a token via getToken). */
  me: () => Promise<User>;
  /** List the issue categories (reference data). */
  listCategories: () => Promise<Category[]>;
  /** Upload a photo (multipart); returns its stored URL. */
  uploadPhoto: (file: File) => Promise<UploadResponse>;
  /** Create an issue report. */
  createIssue: (payload: IssueCreate) => Promise<Issue>;
  /** Run AI analysis on an uploaded photo (suggestions + category + urgency). */
  analyzePhoto: (photoUrl: string) => Promise<AnalysisResult>;
  /** The current user's own reports, newest first. */
  listMyIssues: () => Promise<Issue[]>;
  /** One issue with its status timeline and resolution (owner-scoped). */
  getIssue: (id: number) => Promise<IssueDetail>;
  /** Rate a resolved issue (1-5 stars + optional comment). One per issue. */
  rateIssue: (id: number, payload: { stars: number; comment?: string | null }) => Promise<RatingInfo>;
}

export function createClient(options: ClientOptions): ApiClient {
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    const token = options.getToken?.();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const resp = await fetch(`${baseUrl}${path}`, { ...init, headers });
    if (!resp.ok) {
      let message = resp.statusText;
      try {
        const body = (await resp.json()) as { detail?: string };
        if (body?.detail) message = body.detail;
      } catch {
        // response had no JSON body
      }
      throw new ApiError(resp.status, message);
    }
    if (resp.status === 204) return undefined as T;
    return (await resp.json()) as T;
  }

  return {
    request,
    health: () => request<{ status: string }>("/health"),
    authTelegram: (initData: string) =>
      request<AuthResponse>("/auth/telegram", {
        method: "POST",
        body: JSON.stringify({ init_data: initData }),
      }),
    me: () => request<User>("/me"),
    listCategories: () => request<Category[]>("/categories"),
    uploadPhoto: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<UploadResponse>("/uploads", { method: "POST", body: form });
    },
    createIssue: (payload: IssueCreate) =>
      request<Issue>("/issues", { method: "POST", body: JSON.stringify(payload) }),
    analyzePhoto: (photoUrl: string) =>
      request<AnalysisResult>("/issues/analyze", {
        method: "POST",
        body: JSON.stringify({ photo_url: photoUrl }),
      }),
    listMyIssues: () => request<Issue[]>("/issues/mine"),
    getIssue: (id: number) => request<IssueDetail>(`/issues/${id}`),
    rateIssue: (id: number, payload: { stars: number; comment?: string | null }) =>
      request<RatingInfo>(`/issues/${id}/rating`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  };
}
