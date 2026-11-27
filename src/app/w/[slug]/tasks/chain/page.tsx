"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDown, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, Field, FormError, Input, PageHeader, Select } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace, wsPath } from "@/lib/workspace";

type Step = { title: string; due_date: string; opens_on: string; priority: "low" | "normal" | "high"; after_above: boolean };
const blank = (afterAbove = true): Step => ({ title: "", due_date: "", opens_on: "", priority: "normal", after_above: afterAbove });

/**
 * Several tasks at once for the same people: onboarding, a pipeline's stages, month-end. Each step can open on a date
 * and wait for the step above, so people see the whole list but can only start what is ready.
 */
export default function TaskChainPage() {
  const { slug } = useWorkspace();
  const router = useRouter();
  const people = useQuery({ queryKey: ["task-people", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/tasks/people/", wsPath(slug))) });
  const [steps, setSteps] = useState<Step[]>([blank(false), blank(), blank()]);
  const [who, setWho] = useState<string[]>([]);
  const [waiting, setWaiting] = useState<string[]>([]);
  const [deps, setDeps] = useState<string[]>([]);
  const [check, setCheck] = useState(true);
  const set = (i: number, patch: Partial<Step>) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const filled = steps.filter((s) => s.title.trim());
  const save = useMutation({
    mutationFn: async () => {
      const kept = steps.map((s, i) => ({ s, i })).filter(({ s }) => s.title.trim());
      const pos = new Map(kept.map(({ i }, n) => [i, n]));
      const body = {
        assignee_ids: who, employee_ids: waiting, department_ids: deps, needs_check: check,
        steps: kept.map(({ s, i }, n) => {
          // waits for the nearest kept step above it
          let above = i - 1;
          while (above >= 0 && !pos.has(above)) above--;
          return { title: s.title.trim(), due_date: s.due_date || null, opens_on: s.opens_on || null, priority: s.priority,
            after: s.after_above && n > 0 && above >= 0 ? [pos.get(above)!] : [] };
        }),
      };
      return unwrap(await api.POST("/api/v1/w/{workspace}/tasks/chain/", { ...wsPath(slug), body: body as never })) as unknown as unknown[];
    },
    onSuccess: (made) => { toast.success(`${made.length} tasks given`); router.push(`/w/${slug}/tasks`); },
  });
  const toggle = (list: string[], set: (v: string[]) => void, id: string, on: boolean) => set(on ? [...list, id] : list.filter((x) => x !== id));
  const d = people.data;

  return (
    <div className="w-full">
      <Link href={`/w/${slug}/tasks`} className="text-sm text-stone-500 hover:underline">&larr; Tasks</Link>
      <PageHeader title="Several tasks" guide="tasks"
        description="Give a list of tasks in one go, such as onboarding or a job's stages. Each can open on a date, or wait for the one above it to be done (and checked)." />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="space-y-2 p-4">
          {steps.map((s, i) => (
            <div key={i}>
              {i > 0 && (
                <label className="mb-1 ml-2 flex items-center gap-1.5 text-xs text-stone-600">
                  <input type="checkbox" checked={s.after_above} onChange={(e) => set(i, { after_above: e.target.checked })} />
                  <ArrowDown className="h-3 w-3" /> Waits until the one above is done
                </label>
              )}
              <div className="grid grid-cols-1 gap-2 rounded-md border border-stone-200 p-2 sm:grid-cols-3 md:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                <div className="sm:col-span-3 md:col-span-4">
                  <Field label={`Task ${i + 1}`}><Input value={s.title} onChange={(e) => set(i, { title: e.target.value })} placeholder={i === 0 ? "e.g. Sign the contract" : ""} /></Field>
                </div>
                <Field label="Opens on"><Input type="date" value={s.opens_on} onChange={(e) => set(i, { opens_on: e.target.value })} /></Field>
                <Field label="Due on"><Input type="date" value={s.due_date} onChange={(e) => set(i, { due_date: e.target.value })} /></Field>
                <Field label="Priority"><Select value={s.priority} onChange={(e) => set(i, { priority: e.target.value as Step["priority"] })}><option value="normal">Normal</option><option value="high">High</option><option value="low">Low</option></Select></Field>
                <button type="button" aria-label={`Remove task ${i + 1}`} className="pb-2 text-stone-400 hover:text-red-600" onClick={() => setSteps((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : [blank(false)]))}><X className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          <Button variant="secondary" onClick={() => setSteps((x) => [...x, blank()])}><Plus className="h-4 w-4" /> Add a task</Button>
        </Card>
        <Card className="space-y-3 p-4">
          <p className="text-sm font-medium">Who does them</p>
          <p className="text-xs text-stone-500">Everyone chosen gets their own copy of the list. Nobody chosen: yourself.</p>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {(d?.departments ?? []).length > 0 && <p className="pt-1 text-xs font-semibold uppercase text-stone-500">A department</p>}
            {(d?.departments ?? []).map((x) => <label key={x.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={deps.includes(x.id)} onChange={(e) => toggle(deps, setDeps, x.id, e.target.checked)} />{x.name}</label>)}
            {(d?.people ?? []).length > 0 && <p className="pt-2 text-xs font-semibold uppercase text-stone-500">People</p>}
            {(d?.people ?? []).map((p) => <label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={who.includes(p.id)} onChange={(e) => toggle(who, setWho, p.id, e.target.checked)} />{p.is_me ? `Me (${p.full_name})` : p.full_name}</label>)}
            {(d?.waiting ?? []).length > 0 && <p className="pt-2 text-xs font-semibold uppercase text-stone-500">No login yet</p>}
            {(d?.waiting ?? []).map((w) => <label key={w.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={waiting.includes(w.id)} onChange={(e) => toggle(waiting, setWaiting, w.id, e.target.checked)} />{w.full_name}</label>)}
          </div>
          <label className="flex items-start gap-2 border-t border-stone-100 pt-3 text-sm"><input type="checkbox" className="mt-0.5" checked={check} onChange={(e) => setCheck(e.target.checked)} /> I&apos;ll check each one when it&apos;s done</label>
          <FormError error={save.error} />
          <Button className="w-full" disabled={!filled.length} loading={save.isPending} onClick={() => save.mutate()}>Give {filled.length || ""} task{filled.length === 1 ? "" : "s"}</Button>
        </Card>
      </div>
    </div>
  );
}
