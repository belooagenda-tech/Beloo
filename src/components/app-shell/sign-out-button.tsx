"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/entrar");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleSignOut} disabled={loading} aria-label="Sair">
      <LogOut className="size-4" />
    </Button>
  );
}
