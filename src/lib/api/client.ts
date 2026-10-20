import createClient from "openapi-fetch";

import type { paths } from "./schema";

/** Typed API client for the browser. Calls go through /api/backend, which adds the user's token. */
export const api = createClient<paths>({ baseUrl: "/api/backend" });

export interface ApiErrorBody {
  code: string;
  message: string;
  errors: Record<string, string[]>;
  data?: Record<string, string>;
}

export class ApiError extends Error {
  code: string;
  status: number;
  fieldErrors: Record<string, string[]>;
  /** Details some errors carry for the app to act on, e.g. the date of a closed period. */
  data: Record<string, string>;

  constructor(status: number, body: Partial<ApiErrorBody> | undefined) {
    super(body?.message || "Something went wrong. Please try again.");
    this.status = status;
    this.code = body?.code || "error";
    this.fieldErrors = body?.errors || {};
    this.data = body?.data || {};
  }
}

/** Return the data of an openapi-fetch result, or throw an ApiError with the server's message. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.error !== undefined || !result.response.ok) {
    throw new ApiError(result.response.status, result.error as Partial<ApiErrorBody>);
  }
  return result.data as T;
}

export function fieldError(error: unknown, field: string): string | undefined {
  return error instanceof ApiError ? error.fieldErrors[field]?.[0] : undefined;
}
