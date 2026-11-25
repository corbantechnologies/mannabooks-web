"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, Field, FormError, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { useCostCenters, useProjects } from "@/lib/api/control";
import { useAssignees } from "@/lib/api/crm";
import { type GoalDetail, MEASURES } from "@/lib/goals";
import { todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

/**
 * A goal, on a page of its own: whose it is, the period, how it is measured and the target. Company goals need
 * Goals: manage; heads set their department's; anyone sets their own.
 */
export function GoalForm({ goal, parentId }: { goal?: GoalDetail; parentId?: string }) {
  const router = useRouter();
  const { slug, can, context } = useWorkspace();
  const manage = can("goals.manage");
  const headed = (context.headed_departments ?? []) as { id: string; name: string }[];
  const [f, setF] = useState({
    title: goal?.title ?? "", description: goal?.description ?? "",
    level: goal?.level ?? (manage ? "company" : headed.length ? "department" : "person"),
    department_id: goal?.department_id ?? "", owner_id: goal?.owner_id ?? "", parent_id: goal?.parent_id ?? parentId ?? "",
    period: goal?.period ?? "quarter", anchor: goal?.start_date ?? todayIso(),
    measure: goal?.measure ?? (manage ? "revenue" : "milestones"), direction: goal?.direction ?? "at_least",
    target: goal?.target ?? "", unit: goal?.unit ?? "", project_id: goal?.project_id ?? "", cost_center_id: goal?.cost_center_id ?? "",
    milestones: "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  const departments = useQuery({
    queryKey: ["departments", slug], enabled: manage,
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/departments/", wsPath(slug))),
  });
  const deptOptions = manage ? (departments.data?.results ?? []).map((d) => ({ id: d.id, name: d.name })) : headed;
  const people = useAssignees(slug);
  const projects = (useProjects(slug).data?.results ?? []).filter((p) => p.status === "active" || p.status === "on_hold" || p.id === f.project_id);
  const centres = useCostCenters(slug).data ?? [];
  const goals = useQuery({
    queryKey: ["goals", slug, "now", "", false],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/goals/", { params: { path: { workspace: slug }, query: { when: "now" } } })),
  });
  const measure = MEASURES.find((m) => m.value === f.measure) ?? MEASURES[0];
  const allowed = MEASURES.filter((m) => f.level !== "person" || m.person);
  const save = useMutation({
    mutationFn: async () => {
      const body = {
        title: f.title, description: f.description, level: f.level as "company", period: f.period as "quarter", anchor: f.anchor,
        measure: f.measure as "revenue", direction: f.direction as "at_least", target: f.measure === "milestones" ? "0" : f.target || "0", unit: f.unit,
        department_id: f.level === "department" ? f.department_id || null : null,
        owner_id: f.level === "person" ? f.owner_id || null : f.owner_id || null,
        parent_id: f.parent_id || null,
        project_id: measure.money ? f.project_id || null : null, cost_center_id: measure.money ? f.cost_center_id || null : null,
        ...(goal ? {} : { milestones: f.measure === "milestones" ? f.milestones.split("\n") : [] }),
      };
      return goal
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/goals/{id}/", { params: { path: { workspace: slug, id: goal.id } }, body }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/goals/", { ...wsPath(slug), body }));
    },
    onSuccess: (g) => { toast.success(goal ? "Goal saved" : "Goal set"); router.push(`/w/${slug}/goals/${g.id}`); },
  });
  return (
    <div className="w-full">
      <PageHeader title={goal ? `Change ${goal.title}` : "New goal"} guide="goals"
        description="What you mean to reach, by when, and how MannaBooks measures it as the period goes." />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Card className="space-y-3 p-4 sm:p-5">
          <Field label="Goal" error={fieldError(save.error, "title")}><Input required value={f.title} onChange={set("title")} placeholder="e.g. Grow sales to KES 12 million this year" /></Field>
          <Field label="Why it matters (optional)"><Textarea rows={2} value={f.description} onChange={set("description")} /></Field>
        </Card>
        <Card className="space-y-3 p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Whose goal</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="For">
              <Select value={f.level} onChange={(e) => setF((p) => ({ ...p, level: e.target.value, measure: e.target.value === "person" && !MEASURES.find((m) => m.value === p.measure)?.person ? "milestones" : p.measure }))}>
                {manage && <option value="company">The whole company</option>}
                {(manage || headed.length > 0) && <option value="department">A department</option>}
                <option value="person">A person</option>
              </Select>
            </Field>
            {f.level === "department" && (
              <Field label="Department"><Select required value={f.department_id} onChange={set("department_id")}>
                <option value="">Choose</option>{deptOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select></Field>
            )}
            {f.level === "person" && (
              <Field label="Person" hint="Blank: yourself"><Select value={f.owner_id} onChange={set("owner_id")}>
                <option value="">Me</option>{people.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select></Field>
            )}
            {f.level !== "person" && (
              <Field label="Looked after by" hint="Optional"><Select value={f.owner_id} onChange={set("owner_id")}>
                <option value="">Nobody in particular</option>{people.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select></Field>
            )}
            <Field label="Helps reach" hint="Optional: the bigger goal it serves">
              <Select value={f.parent_id} onChange={set("parent_id")}>
                <option value="">None</option>
                {(goals.data ?? []).filter((g) => g.id !== goal?.id).map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </Select>
            </Field>
          </div>
        </Card>
        <Card className="space-y-3 p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Period and measure</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Period"><Select value={f.period} onChange={set("period")}><option value="month">A month</option><option value="quarter">A quarter</option><option value="year">A year</option></Select></Field>
            <Field label="Which one" hint="Any day in it. Quarters and years follow your financial year."><Input type="date" required value={f.anchor} onChange={set("anchor")} /></Field>
            <Field label="Measured by" hint={measure.hint}>
              <Select value={f.measure} onChange={(e) => setF((p) => ({ ...p, measure: e.target.value, direction: e.target.value === "costs" ? "at_most" : p.direction }))}>
                {allowed.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </Field>
            {f.measure !== "milestones" && (
              <>
                <Field label="Aim">
                  <Select value={f.direction} onChange={set("direction")}><option value="at_least">At least (more is better)</option><option value="at_most">At most (a limit)</option></Select>
                </Field>
                <Field label={f.measure === "tasks_on_time" ? "Target (%)" : measure.money ? `Target (${context.workspace.currency})` : "Target"} error={fieldError(save.error, "target")}>
                  <Input required type="number" inputMode="decimal" min="0" step="any" value={f.target} onChange={set("target")} />
                </Field>
                {f.measure === "manual" && <Field label="Unit" hint="clients, units, %..."><Input value={f.unit} onChange={set("unit")} /></Field>}
              </>
            )}
            {measure.money && f.level !== "person" && projects.length > 0 && (
              <Field label="Only this project" hint="Optional"><Select value={f.project_id} onChange={set("project_id")}>
                <option value="">All</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select></Field>
            )}
            {measure.money && f.level !== "person" && centres.length > 0 && (
              <Field label="Only this cost centre" hint="Optional"><Select value={f.cost_center_id} onChange={set("cost_center_id")}>
                <option value="">All</option>{centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select></Field>
            )}
          </div>
          {f.measure === "milestones" && !goal && (
            <Field label="Milestones" hint="One step per line. You can add, tick and change them on the goal later.">
              <Textarea rows={4} value={f.milestones} onChange={set("milestones")} placeholder={"Choose the venue\nSend the invitations\nRun the event"} />
            </Field>
          )}
          {f.level === "department" && measure.money && <p className="text-xs text-stone-500">Measured from the books for the department&apos;s documents (and its cost centres).</p>}
        </Card>
        <FormError error={save.error} />
        <div className="sticky bottom-0 z-10 flex justify-end gap-2 rounded-lg border border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>{goal ? "Save" : "Set the goal"}</Button>
        </div>
      </form>
    </div>
  );
}
