"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRedirect({ to, delayMs }: { to: string; delayMs: number }) {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => router.replace(to), delayMs);
    return () => clearTimeout(timeout);
  }, [to, delayMs, router]);

  return null;
}
