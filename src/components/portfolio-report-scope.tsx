"use client";

import { useQuery } from "@tanstack/react-query";

import { Field, Select } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useAssignees } from "@/lib/api/crm";
import { useWorkspace } from "@/lib/workspace";

export type ReportScope = { portfolio: string; group: string; lead: string };

/** Who a portfolio report covers: all clients, one client, one of its groups, or one lead's clients. */
export function ReportScopePicker({ value, onChange, clientRequired = false }: { value: ReportScope; onChange: (v: ReportScope) => void; clientRequired?: boolean }) {
  const { slug, can } = useWorkspace();
  const all = can("portfolios.view");
  const people = useAssignees(slug);
  const list = useQuery({
    queryKey: ["portfolios", slug, false, ""],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/portfolios/", { params: { path: { workspace: slug }, query: {} } })),
  });
  const detail = useQuery({
    queryKey: ["portfolio", slug, value.portfolio],
    enabled: !!value.portfolio,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/portfolios/{id}/", { params: { path: { workspace: slug, id: value.portfolio } } })),
  });
  const groups = detail.data?.groups ?? [];
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="Client">
        <Select className="w-64" value={value.portfolio} onChange={(e) => onChange({ portfolio: e.target.value, group: "", lead: "" })}>
          <option value="">{clientRequired ? "Choose a client" : "All clients"}</option>
          {(list.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.customer_name}</option>)}
        </Select>
      </Field>
      {value.portfolio && groups.length > 0 && (
        <Field label="Group">
          <Select className="w-56" value={value.group} onChange={(e) => onChange({ ...value, group: e.target.value })}>
            <option value="">The whole client</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Select>
        </Field>
      )}
      {!value.portfolio && all && (
        <Field label="Lead">
          <Select className="w-56" value={value.lead} onChange={(e) => onChange({ ...value, lead: e.target.value })}>
            <option value="">Any lead</option>
            <option value="none">No lead</option>
            {people.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
        </Field>
      )}
    </div>
  );
}

export function scopeFrom(sp: URLSearchParams): ReportScope {
  return { portfolio: sp.get("portfolio") ?? "", group: sp.get("group") ?? "", lead: sp.get("lead") ?? "" };
}

/** The query string for a scope (and other filters), leaving out what's empty. */
export function query(values: Record<string, string>): string {
  const q = new URLSearchParams(Object.entries(values).filter(([, v]) => v)).toString();
  return q ? `?${q}` : "";
}
