"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";

import { EmployeeEditor } from "@/components/employee-editor";
import { ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { useWorkspace } from "@/lib/workspace";

/** Change an employee's details, on a page of its own. */
export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { slug } = useWorkspace();
  const record = useQuery({
    queryKey: ["employee", slug, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/employees/{id}/", { params: { path: { workspace: slug, id } } })),
  });
  if (record.isLoading) return <Spinner />;
  if (record.error || !record.data) return <ErrorState error={record.error} />;
  const back = () => {
    void qc.invalidateQueries({ queryKey: ["employee", slug, id] });
    void qc.invalidateQueries({ queryKey: ["employee-profile", slug, id] });
    router.push(`/w/${slug}/employees/${id}`);
  };
  return <EmployeeEditor employee={record.data} onClose={back} onSaved={back} />;
}
