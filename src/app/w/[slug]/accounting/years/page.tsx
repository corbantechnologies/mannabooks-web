"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function FinancialYearsPage() {
  const { slug, can } = useWorkspace();
  const p = wsPath(slug);
  const [selected, setSelected] = useState<string | null>(null);
  const years = useQuery({ queryKey: ["fiscal-years", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/fiscal-years/", p)) });
  const yearId = selected ?? years.data?.find((y) => y.status === "open")?.id ?? years.data?.[0]?.id;
  const periods = useQuery({
    queryKey: ["periods", slug, yearId],
    enabled: Boolean(yearId),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/periods/", { params: { path: { workspace: slug }, query: { fiscal_year: yearId } } })),
  });

  const addYear = useMutation({
    mutationFn: async (position: "next" | "previous") => unwrap(await api.POST("/api/v1/w/{workspace}/fiscal-years/", { ...p, body: { position } })),
    onSuccess: (y) => toast.success(`${y.name} added`),
    onError: (e) => toast.error(e.message),
  });
  const yearAction = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "close" | "reopen" }) =>
      action === "close"
        ? unwrap(await api.POST("/api/v1/w/{workspace}/fiscal-years/{id}/close/", { params: { path: { workspace: slug, id } } }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/fiscal-years/{id}/reopen/", { params: { path: { workspace: slug, id } } })),
    onSuccess: (y) => toast.success(`${y.name} is ${y.status}`),
    onError: (e) => toast.error(e.message),
  });
  const periodAction = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "close" | "reopen" }) =>
      action === "close"
        ? unwrap(await api.POST("/api/v1/w/{workspace}/periods/{id}/close/", { params: { path: { workspace: slug, id } } }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/periods/{id}/reopen/", { params: { path: { workspace: slug, id } } })),
    onSuccess: (pr) => toast.success(`${pr.name} is ${pr.status}`),
    onError: (e) => toast.error(e.message),
  });
  const manageYears = can("fiscalyears.manage");
  const managePeriods = can("periods.manage");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial years and periods"
        description="Each year has 12 monthly periods. Close a month once its books are final, so nothing can change in it. Closing a year moves its profit to retained earnings."
        guide="financial-years"
        actions={manageYears && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={addYear.isPending && addYear.variables === "previous"} onClick={() => addYear.mutate("previous")}>Add earlier year</Button>
            <Button loading={addYear.isPending && addYear.variables === "next"} onClick={() => addYear.mutate("next")}>Add next year</Button>
          </div>
        )}
      />
      {years.isLoading ? <Spinner /> : years.error ? <ErrorState error={years.error} /> : (
        <Card>
          <Table head={["Year", "From", "To", "Open months", "Status", ""]}>
            {(years.data ?? []).map((y) => (
              <tr key={y.id} className={y.id === yearId ? "bg-brand-50/50" : "hover:bg-stone-50"}>
                <Td><button className="font-medium hover:underline" onClick={() => setSelected(y.id)}>{y.name}</button></Td>
                <Td>{fmtDate(y.start_date)}</Td>
                <Td>{fmtDate(y.end_date)}</Td>
                <Td>{y.open_periods} of 12</Td>
                <Td>{y.status === "open" ? <Badge tone="green">Open</Badge> : <Badge>Closed</Badge>}</Td>
                <Td className="text-right">
                  {manageYears && (y.status === "open" ? (
                    <Button variant="ghost" className="px-2 py-1" loading={yearAction.isPending} onClick={() => confirm(`Close ${y.name}? Its profit moves to retained earnings and every month is locked.`) && yearAction.mutate({ id: y.id, action: "close" })}>Close year</Button>
                  ) : (
                    <Button variant="ghost" className="px-2 py-1" onClick={() => yearAction.mutate({ id: y.id, action: "reopen" })}>Reopen</Button>
                  ))}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
      {yearId && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-stone-900">Months in {years.data?.find((y) => y.id === yearId)?.name}</h2>
          <Card>
            {periods.isLoading ? <div className="px-4"><Spinner /></div> : (
              <Table head={["Month", "From", "To", "Status", ""]}>
                {(periods.data ?? []).map((pr) => (
                  <tr key={pr.id}>
                    <Td className="font-medium">{pr.name}</Td>
                    <Td>{fmtDate(pr.start_date)}</Td>
                    <Td>{fmtDate(pr.end_date)}</Td>
                    <Td>{pr.status === "open" ? <Badge tone="green">Open</Badge> : <Badge>Closed{pr.closed_by_name ? ` by ${pr.closed_by_name}` : ""}</Badge>}</Td>
                    <Td className="text-right">
                      {managePeriods && <Button variant="ghost" className="px-2 py-1" onClick={() => periodAction.mutate({ id: pr.id, action: pr.status === "open" ? "close" : "reopen" })}>{pr.status === "open" ? "Close" : "Reopen"}</Button>}
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
