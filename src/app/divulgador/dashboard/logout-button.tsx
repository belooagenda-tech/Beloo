"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutDivulgadorAction } from "./actions";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await logoutDivulgadorAction();
    router.replace("/divulgador/login");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleLogout} disabled={loading} aria-label="Sair">
      <LogOut className="size-4" />
    </Button>
  );
}
