"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, signOut } from "next-auth/react";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

import { ApiError } from "@/lib/api/client";

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
      mutationCache: new MutationCache({ onSuccess: () => qc.invalidateQueries(), onError: endSessionOn401 }),
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
