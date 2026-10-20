"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, signOut } from "next-auth/react";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

import { ApiError } from "@/lib/api/client";

/** A save hit a missing earlier year or a closed month: the workspace layout offers to open the books for that date. */
export const PERIOD_PROBLEM = "mannabooks:period-problem";
function reportPeriodProblem(error: unknown) {
  if (error instanceof ApiError && (error.code === "period_missing" || error.code === "period_closed") && error.data.date) {
    window.dispatchEvent(new CustomEvent(PERIOD_PROBLEM, { detail: { code: error.code, message: error.message, date: error.data.date } }));
  }
}

/** The API no longer accepts this session (expired, signed out elsewhere, user removed): sign in again. */
function endSessionOn401(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    const back = encodeURIComponent(window.location.pathname + window.location.search);
    signOut({ callbackUrl: `/signin?expired=1&callbackUrl=${back}` });
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => {
    const qc: QueryClient = new QueryClient({
      // After any successful save, everything cached is stale: open screens refetch at once.
      mutationCache: new MutationCache({ onSuccess: () => qc.invalidateQueries(), onError: (e) => { endSessionOn401(e); reportPeriodProblem(e); } }),
      queryCache: new QueryCache({ onError: endSessionOn401 }),
      defaultOptions: {
        queries: {
          staleTime: 0,
          refetchOnMount: "always",
          refetchOnWindowFocus: false,
          retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
        },
      },
    });
    return qc;
  });
  return (
    <SessionProvider>
      <QueryClientProvider client={client}>
        {children}
        <Toaster position="top-right" />
      </QueryClientProvider>
    </SessionProvider>
  );
}
