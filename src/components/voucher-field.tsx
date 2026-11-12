"use client";

import { useState } from "react";

import { Button, Input } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";

export interface CheckedVoucher { code: string; balance: string; expires_on: string | null; recipient_name: string }

/** Enter a gift voucher's code and check what is left on it. `onChange` gets the checked voucher, or null. */
export function VoucherField({ slug, value, onChange, payable }: {
  slug: string;
  value: CheckedVoucher | null;
  onChange: (v: CheckedVoucher | null) => void;
  /** What there is to pay: the voucher pays up to this. */
  payable?: number;
}) {
  const [code, setCode] = useState(value?.code ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function check() {
    if (!code.trim()) { onChange(null); return; }
    setBusy(true); setError("");
    try {
      const v = unwrap(await api.GET("/api/v1/w/{workspace}/gift-vouchers/check/", { params: { path: { workspace: slug }, query: { code } } }));
      onChange(v as CheckedVoucher);
      setCode(v.code);
    } catch (e) {
      onChange(null);
      setError(e instanceof Error ? e.message : "Couldn't check the voucher.");
    } finally { setBusy(false); }
  }
  const pays = value && payable !== undefined ? Math.min(Number(value.balance), payable) : null;
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input value={code} placeholder="ABCD-2345" autoCapitalize="characters" className="font-mono uppercase" aria-label="Gift voucher code"
          onChange={(e) => { setCode(e.target.value.toUpperCase()); if (value) onChange(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void check(); } }} />
        {value ? <Button type="button" variant="ghost" onClick={() => { setCode(""); onChange(null); }}>Remove</Button>
          : <Button type="button" variant="secondary" loading={busy} onClick={() => void check()}>Check</Button>}
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      {value && (
        <p className="text-xs text-green-800">
          {fmt(value.balance)} left{value.expires_on ? `, valid until ${fmtDate(value.expires_on)}` : ""}{value.recipient_name ? ` (for ${value.recipient_name})` : ""}.
          {pays !== null && <> Pays <span className="font-semibold">{fmt(pays)}</span>{payable !== undefined && payable > pays ? `; ${fmt(payable - pays)} still to pay` : ""}.</>}
        </p>
      )}
    </div>
  );
}
