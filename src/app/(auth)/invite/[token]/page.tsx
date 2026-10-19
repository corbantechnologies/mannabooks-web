"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";

import { Button, ErrorState, FormError, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const here = `/invite/${token}`;

  const invitation = useQuery({
    queryKey: ["invitation", token],
    queryFn: async () => unwrap(await api.GET("/api/v1/invitations/{token}/", { params: { path: { token } } })),
  });
  const accept = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/invitations/{token}/accept/", { params: { path: { token } } })),
    onSuccess: (data) => router.replace(`/w/${data.workspace_slug}`),
  });

  if (invitation.isLoading || status === "loading") return <Spinner />;
  if (invitation.error) return <ErrorState error={invitation.error} />;
  const inv = invitation.data!;
  const closed = inv.status !== "pending" || inv.is_expired;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Join {inv.workspace_name}</h1>
      <p className="text-sm text-stone-600">
        You were invited as <strong>{inv.role_name}</strong>. The invitation is for <strong>{inv.email}</strong>.
      </p>
      {closed ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This invitation is {inv.is_expired ? "expired" : inv.status}. Ask whoever invited you for a new one.
        </p>
      ) : session ? (
        <>
          <p className="text-sm text-stone-600">Signed in as {session.user.email}.</p>
          <FormError error={accept.error} />
          <Button className="w-full" loading={accept.isPending} onClick={() => accept.mutate()}>
            Accept and open {inv.workspace_name}
          </Button>
        </>
      ) : (
        <div className="space-y-2">
          <Link href={`/signup?callbackUrl=${encodeURIComponent(here)}`}>
            <Button className="w-full">Create an account to accept</Button>
          </Link>
          <Link href={`/signin?callbackUrl=${encodeURIComponent(here)}`}>
            <Button variant="secondary" className="w-full">
              I already have an account
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
