"use client";

import { AppRouteError } from "@/components/app/route-state";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AppRouteError message={error.message} onReset={reset} />;
}
