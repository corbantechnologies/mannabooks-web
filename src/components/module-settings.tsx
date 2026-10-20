"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { api, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

import { Button, Card, Field, FormError, Select } from "./ui";

interface Item { key: string; label: string; description: string; modules?: string[] }

/** What the business does and which parts of MannaBooks are switched on. Switched-off parts only leave the menu; nothing is deleted. */
export function ModuleSettings() {
  const { slug, context, can } = useWorkspace();
  const ws = context.workspace;
  const catalog = (context.module_catalog ?? []) as unknown as Item[];
  const goals = (context.goal_catalog ?? []) as unknown as Item[];
  const saved = (ws.modules ?? []) as string[];
  const current = saved.length ? saved : catalog.map((m) => m.key);
  const [goal, setGoal] = useState(ws.business_goal ?? "");
  const [on, setOn] = useState<string[]>(current);
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/w/{workspace}/", {
      params: { path: { workspace: slug } },
      // Everything ticked is stored as "all on", so modules added later switch on by themselves.
      body: { business_goal: goal, modules: on.length === catalog.length ? [] : on } as never,
    })),
    onSuccess: () => toast.success("Modules saved"),
  });
  if (!can("workspace.manage")) return null;
  const pickGoal = (key: string) => {
    setGoal(key);
    const g = goals.find((x) => x.key === key);
    if (g?.modules) setOn(catalog.map((m) => m.key).filter((k) => g.modules!.includes(k)));
  };
  const toggle = (key: string) => setOn((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : catalog.map((m) => m.key).filter((k) => k === key || prev.includes(k)));
  return (
    <Card className="p-5">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div>
          <h2 className="font-semibold">Modules</h2>
          <p className="mt-1 text-sm text-stone-600">Switch off what you don&apos;t use to keep the menu short. Switching a module off hides it; your records stay, and switching it back on brings them back.</p>
        </div>
        <Field label="What the business mainly does" hint="Choosing one ticks the modules it needs. You can still tick more.">
          <Select value={goal} onChange={(e) => pickGoal(e.target.value)}>
            <option value="">Not chosen</option>
            {goals.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
          </Select>
        </Field>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((m) => (
            <label key={m.key} className="flex items-start gap-2.5 rounded-md border border-stone-200 p-3 text-sm">
              <input type="checkbox" className="mt-0.5" checked={on.includes(m.key)} onChange={() => toggle(m.key)} />
              <span><span className="font-medium text-stone-900">{m.label}</span><span className="block text-xs text-stone-600">{m.description}</span></span>
            </label>
          ))}
        </div>
        <p className="text-xs text-stone-500">Accounting, reports, customers, products, suppliers, employees and settings are always on.</p>
        <FormError error={save.error} />
        <Button type="submit" loading={save.isPending} disabled={!on.length}>Save modules</Button>
      </form>
    </Card>
  );
}
