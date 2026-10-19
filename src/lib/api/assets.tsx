"use client";

import { useQuery } from "@tanstack/react-query";

import { ApiError, api, unwrap } from "./client";
import type { components } from "./schema";

type S = components["schemas"];
export type FixedAsset = S["FixedAsset"];
export type ReportRequest = S["ReportRequest"];
export type ReportSubmission = S["ReportSubmission"];

type Tone = "stone" | "green" | "amber" | "red" | "blue";
export const ASSET_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: "In use", tone: "green" }, fully_depreciated: { label: "Fully depreciated", tone: "blue" }, disposed: { label: "Sold or scrapped", tone: "stone" },
};
export const METHODS = [
  { value: "straight_line", label: "Straight line", hint: "The same amount every month over its life." },
  { value: "reducing_balance", label: "Reducing balance", hint: "A yearly percentage of what is left, so less each year (common for vehicles)." },
  { value: "none", label: "Not depreciated", hint: "For land." },
] as const;
export const REPORT_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Waiting", tone: "amber" }, submitted: { label: "Submitted", tone: "blue" }, late: { label: "Overdue", tone: "red" },
  accepted: { label: "Accepted", tone: "green" }, returned: { label: "Sent back", tone: "red" },
};
export const REPORT_FREQUENCIES = [
  { value: "once", label: "Once" }, { value: "daily", label: "Every working day" }, { value: "weekly", label: "Every week" }, { value: "monthly", label: "Every month" },
] as const;

export function useAssetCategories(slug: string) {
  return useQuery({
    queryKey: ["asset-categories", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/fixed-assets/categories/", { params: { path: { workspace: slug } } })),
    staleTime: 5 * 60_000,
  });
}

/** POST a form with files (multipart) through the API gateway. */
export async function sendForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`/api/backend${path}`, { method: "POST", body: form });
  const data = res.status === 204 ? undefined : await res.json().catch(() => undefined);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

/** Download a file the API serves (it checks who may see it). */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const res = await fetch(`/api/backend${path}`);
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => undefined));
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename || "download";
  a.click();
  URL.revokeObjectURL(href);
}
