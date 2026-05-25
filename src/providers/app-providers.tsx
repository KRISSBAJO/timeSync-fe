"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        richColors={false}
        closeButton
        position="top-right"
        toastOptions={{
          classNames: {
            toast: "border border-[#dfe8f6] bg-white text-[#10143f] shadow-[0_24px_70px_rgba(18,31,67,0.14)]",
            title: "text-[#10143f] font-extrabold",
            description: "text-[#68748c] font-semibold",
            success: "border-[#c8efe0]",
            error: "border-[#ffd6d6]",
            actionButton: "bg-[#3820d7] text-white",
            cancelButton: "bg-[#eef2f8] text-[#10143f]",
          },
        }}
      />
    </QueryClientProvider>
  );
}
