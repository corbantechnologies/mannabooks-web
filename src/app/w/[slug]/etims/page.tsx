"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import type { EtimsDevice } from "@/lib/api/types";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function EtimsPage() {
  const { slug, context } = useWorkspace();
  const device = useQuery({ queryKey: ["etims-device", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/etims/device/", wsPath(slug))) });
  const submissions = useQuery({ queryKey: ["etims-submissions", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/etims/submissions/", wsPath(slug))) });
  return (
    <div className="space-y-6">
      <PageHeader title="KRA eTIMS" description="Invoices, cash sales and credit notes are signed by KRA through eTIMS (OSCU, the online system: no physical device needed)." guide="etims" />
      {!context.etims_enabled && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>eTIMS is switched off until KRA approval.</strong> MannaBooks does not contact KRA at all for now, so documents carry no eTIMS status. You can save your OSCU details now and connect once it is switched on.
        </div>
      )}
      {device.isLoading ? <Spinner /> : device.error ? <ErrorState error={device.error} /> : <ConnectionForm device={device.data!} />}
      <div>
        <h2 className="mb-2 text-sm font-semibold">Recent submissions</h2>
        <Card>
          {(submissions.data?.results ?? []).length === 0 ? <EmptyState title="Nothing sent to KRA yet" /> : (
            <Table head={["Document", "KRA no.", "Status", "Attempts", "Last error"]}>
              {submissions.data!.results.map((s) => (
                <tr key={s.id}>
                  <Td className="font-mono text-xs">{s.document_number}</Td>
                  <Td>{s.kra_invoice_number}</Td>
                  <Td><Badge tone={s.status === "signed" ? "green" : s.status === "failed" ? "red" : "blue"}>{s.status}</Badge></Td>
                  <Td>{s.attempts}</Td>
                  <Td className="text-xs text-stone-500">{s.last_error}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

function ConnectionForm({ device }: { device: EtimsDevice }) {
  const { slug, can, context } = useWorkspace();
  const manage = can("etims.manage");
  const [form, setForm] = useState({
    kra_pin: device.kra_pin ?? "", branch_code: device.branch_code ?? "00", device_serial: device.device_serial ?? "",
    environment: (device.environment ?? "sandbox") as "sandbox" | "production",
  });
  const save = useMutation({
    mutationFn: async () => unwrap(await api.PUT("/api/v1/w/{workspace}/etims/device/", { ...wsPath(slug), body: form })),
    onSuccess: () => toast.success("eTIMS details saved"),
  });
  const connect = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/etims/device/connect/", wsPath(slug))),
    onSuccess: () => toast.success("Connected to KRA eTIMS"),
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const connected = Boolean(device.initialised_at && device.has_communication_key);
  return (
    <Card className="p-5">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">OSCU details from the KRA eTIMS portal</h2>
          {connected ? <Badge tone="green">Connected · {device.sdc_id}</Badge> : <Badge>Not connected</Badge>}
        </div>
        <p className="text-sm text-stone-600">
          Apply for OSCU on the KRA eTIMS portal and choose MannaBooks as your system. KRA then gives you a serial number for each branch.
        </p>
        <fieldset disabled={!manage} className="grid gap-3 sm:grid-cols-2">
          <Field label="KRA PIN" error={fieldError(save.error, "kra_pin")}><Input required value={form.kra_pin} onChange={set("kra_pin")} maxLength={11} autoCapitalize="characters" className="uppercase" placeholder="P051234567X" /></Field>
          <Field label="Branch id" error={fieldError(save.error, "branch_code")} hint="00 for the head office."><Input required value={form.branch_code} onChange={set("branch_code")} /></Field>
          <Field label="OSCU serial number" error={fieldError(save.error, "device_serial")} hint="KRA calls it the device serial number."><Input required value={form.device_serial} onChange={set("device_serial")} /></Field>
          <Field label="Environment"><Select value={form.environment} onChange={set("environment")}><option value="sandbox">KRA sandbox (testing)</option><option value="production">KRA production</option></Select></Field>
        </fieldset>
        <FormError error={save.error ?? connect.error} />
        {manage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" loading={save.isPending}>Save details</Button>
            <Button type="button" variant="secondary" loading={connect.isPending} disabled={!context.etims_enabled || !device.id} onClick={() => connect.mutate()}>
              {connected ? "Reconnect to KRA" : "Connect to KRA"}
            </Button>
            {!context.etims_enabled && <span className="text-xs text-stone-500">Available once eTIMS is switched on.</span>}
          </div>
        )}
      </form>
    </Card>
  );
}
