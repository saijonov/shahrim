/**
 * Typed admin API layer (PRD §7). Wraps the shared @shahrim/api-client
 * transport (`createClient` / `request`) with the admin-only endpoints and
 * response shapes. Everything goes through the shared `request`, so the admin
 * JWT (localStorage['shahrim_admin_token']) is attached automatically.
 */
import { createClient, ApiError } from "@shahrim/api-client";
import type {
  Issue,
  IssueStatus,
  Urgency,
  Category,
  StatusHistoryEntry,
  Resolution,
  UploadResponse,
} from "@shahrim/api-client";

export { ApiError };
export type {
  Issue,
  IssueStatus,
  Urgency,
  Category,
  StatusHistoryEntry,
  Resolution,
};

/** Where the admin session token lives (kept distinct from the citizen token). */
export const ADMIN_TOKEN_KEY = "shahrim_admin_token";

// ---- Admin-specific response/request shapes ----

export interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  role: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  admin: AdminUser;
}

/** An issue as the admin sees it — the citizen fields plus reporter identity. */
export interface AdminIssue extends Issue {
  reporter_name: string | null;
  reporter_phone: string | null;
}

export interface AdminIssueDetail extends AdminIssue {
  status_history: StatusHistoryEntry[];
  resolution: Resolution | null;
}

/** Lightweight point for the map layer (only issues that have coordinates). */
export interface MapPoint {
  id: number;
  lat: number;
  lng: number;
  urgency: Urgency | null;
  category_code: string;
  status: IssueStatus;
}

export interface IssueListResult {
  items: AdminIssue[];
  total: number;
}

export interface CategoryCount {
  code: string;
  name_uz: string;
  count: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface Analytics {
  total: number;
  by_status: Record<IssueStatus, number>;
  by_category: CategoryCount[];
  avg_resolution_hours: number | null;
  avg_rating: number | null;
  trend: TrendPoint[];
}

/** The filter set shared across the queue table, map and (optionally) queries. */
export interface IssueFilters {
  status?: IssueStatus | "";
  category?: string;
  urgency?: Urgency | "";
  date_from?: string;
  date_to?: string;
  district?: string;
  limit?: number;
  offset?: number;
}

export interface StatusChange {
  status: IssueStatus;
  note?: string;
}

export interface ResolvePayload {
  result_photo_url?: string;
  note?: string;
}

// ---- 401 interceptor plumbing ----
//
// A single module-level handler lets any admin request that comes back 401 kick
// the app to the login screen (and drop the stale token). App registers it.
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}

export function getToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

/** Build a `?a=b&c=d` query string, skipping empty/undefined values. */
function qs(filters: IssueFilters = {}): string {
  const params = new URLSearchParams();
  const add = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "" || value === null) return;
    params.set(key, String(value));
  };
  add("status", filters.status);
  add("category", filters.category);
  add("urgency", filters.urgency);
  add("date_from", filters.date_from);
  add("date_to", filters.date_to);
  add("district", filters.district);
  add("limit", filters.limit);
  add("offset", filters.offset);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export interface AdminApi {
  login: (email: string, password: string) => Promise<LoginResponse>;
  me: () => Promise<AdminUser>;
  listIssues: (filters?: IssueFilters) => Promise<IssueListResult>;
  mapPoints: (filters?: IssueFilters) => Promise<MapPoint[]>;
  getIssue: (id: number) => Promise<AdminIssueDetail>;
  setStatus: (id: number, change: StatusChange) => Promise<AdminIssue>;
  resolve: (id: number, payload: ResolvePayload) => Promise<AdminIssue>;
  analytics: () => Promise<Analytics>;
  listCategories: () => Promise<Category[]>;
  uploadPhoto: (file: File) => Promise<UploadResponse>;
}

export function createAdminClient(): AdminApi {
  const client = createClient({
    baseUrl: import.meta.env.VITE_API_BASE || "/api",
    getToken,
  });

  // Every authenticated call routes through here so a 401 always logs out.
  async function req<T>(path: string, init?: RequestInit): Promise<T> {
    try {
      return await client.request<T>(path, init);
    } catch (err) {
      if (isUnauthorized(err)) {
        clearToken();
        unauthorizedHandler?.();
      }
      throw err;
    }
  }

  return {
    // Login must NOT trip the 401 interceptor: a 401 here means bad credentials,
    // shown inline on the form, not an expired session.
    login: (email, password) =>
      client.request<LoginResponse>("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    me: () => req<AdminUser>("/admin/me"),
    listIssues: (filters) => req<IssueListResult>(`/admin/issues${qs(filters)}`),
    mapPoints: (filters) => req<MapPoint[]>(`/admin/issues/map${qs(filters)}`),
    getIssue: (id) => req<AdminIssueDetail>(`/admin/issues/${id}`),
    setStatus: (id, change) =>
      req<AdminIssue>(`/admin/issues/${id}/status`, {
        method: "POST",
        body: JSON.stringify(change),
      }),
    resolve: (id, payload) =>
      req<AdminIssue>(`/admin/issues/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    analytics: () => req<Analytics>("/admin/analytics"),
    listCategories: () => req<Category[]>("/categories"),
    uploadPhoto: (file) => {
      const form = new FormData();
      form.append("file", file);
      return req<UploadResponse>("/uploads", { method: "POST", body: form });
    },
  };
}
