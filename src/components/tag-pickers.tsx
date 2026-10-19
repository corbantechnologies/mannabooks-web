"use client";

import Link from "next/link";

import { Meta } from "@/components/document-view";
import { Field, Select } from "@/components/ui";
import { useCostCenters, useProjects } from "@/lib/api/control";
import { useWorkspace } from "@/lib/workspace";

export interface Tags { cost_center_id: string; project_id: string }

export function tagsOf(doc?: { cost_center_id?: string | null; project_id?: string | null } | null): Tags {
  return { cost_center_id: doc?.cost_center_id ?? "", project_id: doc?.project_id ?? "" };
}

export function tagsBody(t: Tags) {
  return { cost_center_id: t.cost_center_id || null, project_id: t.project_id || null };
}

/** Cost centre and project pickers. Shown only once the workspace has cost centres or projects. */
export function TagPickers({ value, onChange }: { value: Tags; onChange: (next: Tags) => void }) {
  const { slug } = useWorkspace();
  const centres = (useCostCenters(slug).data ?? []).filter((c) => c.is_active || c.id === value.cost_center_id);
  const projects = (useProjects(slug).data?.results ?? []).filter((p) => p.status === "active" || p.status === "on_hold" || p.id === value.project_id);
  return (
    <>
      {centres.length > 0 && (
        <Field label="Cost centre">
          <Select value={value.cost_center_id} onChange={(e) => onChange({ ...value, cost_center_id: e.target.value })}>
            <option value="">None</option>
            {centres.map((c) => <option key={c.id} value={c.id}>{c.code} {c.name}</option>)}
          </Select>
        </Field>
      )}
      {projects.length > 0 && (
        <Field label="Project">
          <Select value={value.project_id} onChange={(e) => onChange({ ...value, project_id: e.target.value })}>
            <option value="">None</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}
          </Select>
        </Field>
      )}
    </>
  );
}

/** The tags on a saved document, for its details card. */
export function TagsMeta({ doc }: { doc: { cost_center_name?: string | null; project_id?: string | null; project_name?: string | null } }) {
  const { slug } = useWorkspace();
  return (
    <>
      {doc.cost_center_name && <Meta label="Cost centre">{doc.cost_center_name}</Meta>}
      {doc.project_name && <Meta label="Project"><Link className="hover:underline" href={`/w/${slug}/projects/${doc.project_id}`}>{doc.project_name}</Link></Meta>}
    </>
  );
}
