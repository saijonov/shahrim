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

export interface ApiClient {
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  health: () => Promise<{ status: string }>;
  /** Validate Telegram Mini App initData server-side and get a session token. */
  authTelegram: (initData: string) => Promise<AuthResponse>;
  /** Current authenticated user (requires a token via getToken). */
  me: () => Promise<User>;
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
  };
}
