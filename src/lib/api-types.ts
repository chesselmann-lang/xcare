/**
 * S327 — Shared generic API response types
 *
 * Use these wrappers for all API routes so callers always receive a
 * predictable shape regardless of the specific resource.
 *
 * Pattern:
 *   Route handler:   return NextResponse.json(ok(data))
 *   Route handler:   return NextResponse.json(err("Not found"), { status: 404 })
 *   Client:          const res: ApiResponse<Anbieter[]> = await r.json()
 *                    if (!res.ok) { toast.error(res.error); return; }
 *                    doSomethingWith(res.data)
 *
 * Examples:
 *   return NextResponse.json({ data: anbieter } satisfies ApiOk<Anbieter>);
 *   return NextResponse.json({ error: "Not found" } satisfies ApiError, { status: 404 });
 */

/** Successful API response containing a single item */
export interface ApiOk<T> {
  data: T;
  error?: never;
}

/** Successful API response containing a list */
export interface ApiList<T> {
  data: T[];
  total?: number;
  cursor?: string | null;
  error?: never;
}

/** Error API response */
export interface ApiError {
  error: string;
  details?: string;
  data?: never;
}

/** Union type for route handlers */
export type ApiResponse<T> = ApiOk<T> | ApiError;
export type ApiListResponse<T> = ApiList<T> | ApiError;

/** Stub mode marker (Stripe not configured etc.) */
export interface ApiStub {
  stub: true;
  message: string;
  [key: string]: unknown;
}

/** Type guard: check if response is an error */
export function isApiError(res: unknown): res is ApiError {
  return typeof res === "object" && res !== null && "error" in res && typeof (res as ApiError).error === "string";
}

/** Helper: build a successful paginated response */
export function paginatedResponse<T>(
  items: T[],
  opts?: { total?: number; cursor?: string | null }
): ApiList<T> {
  return { data: items, ...opts };
}

// ── Discriminated-union variant (preferred for new routes) ───────────────────
//
// Uses ok: boolean so TypeScript can narrow automatically:
//
//   const res: OkResponse<Anbieter> | ErrResponse = await r.json();
//   if (res.ok) { res.data.name }  // TypeScript knows data exists here
//

export type OkResponse<T> = {
  ok: true;
  data: T;
  message?: string;
};

export type ErrResponse = {
  ok: false;
  error: string;
  code?: string;
};

/** Discriminated-union API response — preferred over ApiResponse<T> for new routes */
export type Result<T> = OkResponse<T> | ErrResponse;

/** Paginated result */
export type PaginatedPayload<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PaginatedResult<T> = Result<PaginatedPayload<T>>;

// ── Factory helpers ───────────────────────────────────────────────────────────

export function resultOk<T>(data: T, message?: string): OkResponse<T> {
  return { ok: true, data, ...(message ? { message } : {}) };
}

export function resultErr(error: string, code?: string): ErrResponse {
  return { ok: false, error, ...(code ? { code } : {}) };
}

export function resultPaginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): OkResponse<PaginatedPayload<T>> {
  return resultOk({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ── Type guards ───────────────────────────────────────────────────────────────

export function isResultOk<T>(res: Result<T>): res is OkResponse<T> {
  return res.ok === true;
}

export function isResultErr<T>(res: Result<T>): res is ErrResponse {
  return res.ok === false;
}

// ── Canonical error responses ─────────────────────────────────────────────────

export const RESULT_UNAUTHORIZED: ErrResponse  = { ok: false, error: "Nicht angemeldet.",          code: "UNAUTHORIZED"    };
export const RESULT_FORBIDDEN:    ErrResponse  = { ok: false, error: "Keine Berechtigung.",         code: "FORBIDDEN"       };
export const RESULT_NOT_FOUND:    ErrResponse  = { ok: false, error: "Nicht gefunden.",             code: "NOT_FOUND"       };
export const RESULT_RATE_LIMITED: ErrResponse  = { ok: false, error: "Zu viele Anfragen.",          code: "RATE_LIMITED"    };
export const RESULT_INTERNAL:     ErrResponse  = { ok: false, error: "Interner Fehler.",            code: "INTERNAL_ERROR"  };
export const RESULT_EMPTY: OkResponse<null>    = { ok: true,  data: null };
