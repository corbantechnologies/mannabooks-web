"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, Select, Spinner, Table, Td, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { fmtDate } from "@/lib/format";
import type { GoalDetail } from "@/lib/goals";

type Review = components["schemas"]["GoalReviewOut"];

const RATING_TONE = ["red", "amber", "blue", "green", "green"] as const;

/** Five buttons, one per rating word (the business sets the words). */
function RatingPicker({ labels, value, onChange }: { labels: string[]; value: number | null; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Rating">
      {labels.map((word, i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i + 1} onClick={() => onChange(i + 1)}
          className={clsx("rounded-full px-3 py-1.5 text-sm ring-1", value === i + 1 ? "bg-brand-700 font-medium text-white ring-brand-700" : "ring-stone-300 hover:bg-stone-50")}>
          {i + 1} · {word}
        </button>
      ))}
    </div>
  );
}

export function RatingBadge({ n, label }: { n: number | null | undefined; label: string }) {
  if (!n) return <span className="text-stone-400">Not yet</span>;
  return <Badge tone={RATING_TONE[n - 1]}>{n} · {label}</Badge>;
}

/** On a goal's page once its period has ended: the owner's look back, then the manager's rating. */
export function GoalReviewCard({ slug, goal, onSaved }: { slug: string; goal: GoalDetail; onSaved: (g: GoalDetail) => void }) {
  const r = goal.review as Review;
  const [editSelf, setEditSelf] = useState(false);
  const [editMgr, setEditMgr] = useState(false);
  const [self, setSelf] = useState({ rating: r.self_rating ?? null, went_well: r.went_well, hard: r.hard, next_steps: r.next_steps });
  const [mgr, setMgr] = useState({ rating: r.rating ?? null, comment: r.comment });
  const save = useMutation({
    mutationFn: async (part: "self" | "manager") => unwrap(await api.POST("/api/v1/w/{workspace}/goals/{id}/review/", {
      params: { path: { workspace: slug, id: goal.id } },
      body: part === "self" ? { part, rating: self.rating ?? 0, went_well: self.went_well, hard: self.hard, next_steps: self.next_steps }
        : { part, rating: mgr.rating ?? 0, comment: mgr.comment },
    })),
    onSuccess: (g, part) => { onSaved(g); toast.success("Review saved"); if (part === "self") setEditSelf(false); else setEditMgr(false); },
  });
  if (r.state === "off" || r.state === "not_due") return null;
  const showSelfForm = r.can_write && (editSelf || !r.self_at);
  const showMgrForm = r.can_review && (editMgr || !r.reviewed_at);
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Review</h2>
        <Badge tone={r.state === "done" ? "green" : "amber"}>{r.state_label}</Badge>
      </div>
      <div className={clsx("mt-3 grid gap-5", r.self_review && r.manager_review && "lg:grid-cols-2")}>
        {r.self_review && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-stone-700">{goal.owner_name ? `${goal.owner_name}'s look back` : "Looking back"}</h3>
            {showSelfForm ? (
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate("self"); }}>
                <Field label="How did it go?"><RatingPicker labels={r.labels} value={self.rating} onChange={(n) => setSelf((p) => ({ ...p, rating: n }))} /></Field>
                <Field label="What went well"><Textarea rows={2} value={self.went_well} onChange={(e) => setSelf((p) => ({ ...p, went_well: e.target.value }))} /></Field>
                <Field label="What got in the way"><Textarea rows={2} value={self.hard} onChange={(e) => setSelf((p) => ({ ...p, hard: e.target.value }))} /></Field>
                <Field label="What next, or what to do differently"><Textarea rows={2} value={self.next_steps} onChange={(e) => setSelf((p) => ({ ...p, next_steps: e.target.value }))} /></Field>
                <FormError error={save.variables === "self" ? save.error : null} />
                <div className="flex gap-2">
                  <Button type="submit" loading={save.isPending && save.variables === "self"} disabled={!self.rating}>Save my review</Button>
                  {r.self_at && <Button type="button" variant="secondary" onClick={() => setEditSelf(false)}>Cancel</Button>}
                </div>
              </form>
            ) : r.self_at ? (
              <div className="space-y-2 text-sm">
                <RatingBadge n={r.self_rating} label={r.self_rating_label} />
                {r.went_well && <p><span className="font-medium">Went well:</span> <span className="whitespace-pre-wrap">{r.went_well}</span></p>}
                {r.hard && <p><span className="font-medium">Got in the way:</span> <span className="whitespace-pre-wrap">{r.hard}</span></p>}
                {r.next_steps && <p><span className="font-medium">Next:</span> <span className="whitespace-pre-wrap">{r.next_steps}</span></p>}
                <p className="text-xs text-stone-500">{r.self_by_name} · {r.self_at ? fmtDate(r.self_at) : ""}</p>
                {r.can_write && <button type="button" className="text-sm text-brand-700 hover:underline" onClick={() => setEditSelf(true)}>Change</button>}
              </div>
            ) : <p className="text-sm text-stone-500">Waiting for {goal.owner_name || "whoever looks after the goal"} to look back on it.</p>}
          </div>
        )}
        {r.manager_review && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-stone-700">Manager&apos;s review</h3>
            {showMgrForm ? (
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate("manager"); }}>
                <Field label="Rating"><RatingPicker labels={r.labels} value={mgr.rating} onChange={(n) => setMgr((p) => ({ ...p, rating: n }))} /></Field>
                <Field label="Comment"><Textarea rows={3} value={mgr.comment} onChange={(e) => setMgr((p) => ({ ...p, comment: e.target.value }))} /></Field>
                <FormError error={save.variables === "manager" ? save.error : null} />
                <div className="flex gap-2">
                  <Button type="submit" loading={save.isPending && save.variables === "manager"} disabled={!mgr.rating}>Save the review</Button>
                  {r.reviewed_at && <Button type="button" variant="secondary" onClick={() => setEditMgr(false)}>Cancel</Button>}
                </div>
              </form>
            ) : r.reviewed_at ? (
              <div className="space-y-2 text-sm">
                <RatingBadge n={r.rating} label={r.rating_label} />
                {r.comment && <p className="whitespace-pre-wrap">{r.comment}</p>}
                <p className="text-xs text-stone-500">{r.reviewed_by_name} · {r.reviewed_at ? fmtDate(r.reviewed_at) : ""}</p>
                {r.can_review && <button type="button" className="text-sm text-brand-700 hover:underline" onClick={() => setEditMgr(true)}>Change</button>}
              </div>
            ) : <p className="text-sm text-stone-500">{r.state === "done" ? "Not needed: nobody is above the goal's owner, so their look back completes it."
              : r.self_review && !r.self_at ? "The manager reviews it after the look back." : "Waiting for the manager's review."}</p>}
          </div>
        )}
      </div>
    </Card>
  );
}

/** Goals page, Reviews tab: reviews I should write, ones waiting for my review, and every review looking back. */
export function GoalReviews({ slug, canManage }: { slug: string; canManage: boolean }) {
  const [box, setBox] = useState<"to_write" | "to_review" | "all">("to_write");
  const [person, setPerson] = useState("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const query = { box, ...(box === "all" ? { person: person || undefined, since: since || undefined, until: until || undefined } : {}) };
  const q = useQuery({
    queryKey: ["goal-reviews", slug, query],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/goals/reviews/", { params: { path: { workspace: slug }, query } })),
  });
  const everyone = useQuery({
    queryKey: ["goal-reviews", slug, { box: "all" }], enabled: box === "all",
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/goals/reviews/", { params: { path: { workspace: slug }, query: { box: "all" } } })),
  });
  const people = [...new Map((everyone.data ?? []).filter((g) => g.owner_id).map((g) => [g.owner_id!, g.owner_name])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const rows = q.data ?? [];
  const boxes = [["to_write", "Mine to write"], ["to_review", "Waiting for my review"], ["all", "All reviews"]] as const;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {boxes.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setBox(k)}
              className={clsx("rounded-full px-3 py-1 text-sm ring-1", box === k ? "bg-brand-50 font-medium text-brand-800 ring-brand-200" : "ring-stone-200 hover:bg-stone-50")}>{label}</button>
          ))}
        </div>
        {canManage && <Button variant="secondary" onClick={() => setSettingsOpen(true)}>Review settings</Button>}
      </div>
      {box === "all" && (
        <Card className="grid gap-3 p-4 sm:grid-cols-3">
          <Field label="Whose goals">
            <Select value={person} onChange={(e) => setPerson(e.target.value)}>
              <option value="">Everyone</option>
              {people.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </Select>
          </Field>
          <Field label="Ended from"><Input type="date" value={since} onChange={(e) => setSince(e.target.value)} /></Field>
          <Field label="Ended to"><Input type="date" value={until} min={since || undefined} onChange={(e) => setUntil(e.target.value)} /></Field>
        </Card>
      )}
      <Card>
        {q.isLoading ? <div className="px-4"><Spinner /></div> : q.error ? <div className="p-4"><ErrorState error={q.error} /></div> : rows.length === 0 ? (
          <EmptyState title={box === "to_write" ? "No reviews for you to write" : box === "to_review" ? "Nothing waiting for your review" : "No ended goals yet"}>
            {box === "all" ? "Goals are reviewed once their period ends." : "A goal asks for a review once its period ends."}
          </EmptyState>
        ) : (
          <Table head={["Goal", "Whose", "Ended", "Own rating", "Manager's rating", "Review"]}>
            {rows.map((g) => (
              <tr key={g.id} className="hover:bg-stone-50">
                <Td><Link className="font-medium hover:underline" href={`/w/${slug}/goals/${g.id}`}>{g.title}</Link>
                  <span className="block text-xs text-stone-500">{g.status_label} · {Number(g.percent).toFixed(0)}% of the target</span></Td>
                <Td>{g.level === "company" ? "The company" : g.level === "department" ? g.department_name : g.owner_name}</Td>
                <Td className="whitespace-nowrap">{fmtDate(g.end_date)}</Td>
                <Td>{g.review.self_review ? <RatingBadge n={g.review.self_rating} label={g.review.self_rating_label} /> : <span className="text-stone-400">Not used</span>}</Td>
                <Td>{g.review.manager_review ? <RatingBadge n={g.review.rating} label={g.review.rating_label} /> : <span className="text-stone-400">Not used</span>}</Td>
                <Td>{g.review.state === "done" ? <Badge tone="green">Reviewed</Badge> : <Badge tone="amber">{g.review.state === "to_write" ? "Look back to write" : "Manager to review"}</Badge>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {settingsOpen && <ReviewSettings slug={slug} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

/** Goals: manage sets how reviews work: which steps, the five rating words, and reminders. */
function ReviewSettings({ slug, onClose }: { slug: string; onClose: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["goal-settings", slug],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/goals/settings/", { params: { path: { workspace: slug } } })),
  });
  const [f, setF] = useState<{ self_review: boolean; manager_review: boolean; remind: boolean; rating_labels: string[] } | null>(null);
  const v = f ?? (q.data ? { self_review: !!q.data.self_review, manager_review: !!q.data.manager_review, remind: !!q.data.remind, rating_labels: q.data.rating_labels ?? [] } : null);
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PATCH("/api/v1/w/{workspace}/goals/settings/", { params: { path: { workspace: slug } }, body: v! })),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["goal-settings", slug] }); void qc.invalidateQueries({ queryKey: ["goal-reviews", slug] }); void qc.invalidateQueries({ queryKey: ["goal", slug] }); toast.success("Review settings saved"); onClose(); },
  });
  const set = (patch: Partial<NonNullable<typeof v>>) => setF({ ...v!, ...patch });
  return (
    <Modal open title="How goal reviews work" onClose={onClose}>
      {!v ? <Spinner /> : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={v.self_review} onChange={(e) => set({ self_review: e.target.checked })} />
            <span><span className="font-medium">The owner looks back first</span><span className="block text-stone-500">What went well, what got in the way, what next, and their own rating.</span></span></label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={v.manager_review} onChange={(e) => set({ manager_review: e.target.checked })} />
            <span><span className="font-medium">Their manager rates it</span><span className="block text-stone-500">Their supervisor or department head; company goals by someone with Goals: manage.</span></span></label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={v.remind} onChange={(e) => set({ remind: e.target.checked })} />
            <span className="font-medium">Send reminders when a review is due</span></label>
          <Field label="The five ratings, lowest first">
            <div className="grid gap-2 sm:grid-cols-5">
              {v.rating_labels.map((w, i) => (
                <Input key={i} aria-label={`Rating ${i + 1}`} value={w} maxLength={30} onChange={(e) => set({ rating_labels: v.rating_labels.map((x, j) => (j === i ? e.target.value : x)) })} />
              ))}
            </div>
          </Field>
          {!v.self_review && !v.manager_review && <p className="text-sm text-amber-700">With both steps off, goals aren&apos;t reviewed.</p>}
          <FormError error={save.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}>Save</Button></div>
        </form>
      )}
    </Modal>
  );
}
