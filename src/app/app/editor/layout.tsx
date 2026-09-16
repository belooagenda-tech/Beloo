import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOwnProfile } from "@/lib/supabase/session";
import { EditorTabs } from "./editor-tabs";

export const metadata: Metadata = { title: "Editor" };

// Mesmo padrão de gate de /app/admin/page.tsx — redundante em relação ao
// check dentro das Server Actions (defesa em profundidade).
export default async function EditorLayout({ children }: { children: ReactNode }) {
  const profile = await getOwnProfile();
  if (!profile?.is_admin && !profile?.is_layout_editor) {
    redirect("/app");
  }

  return (
    <div className="-mx-4 -my-6 sm:-mx-6">
      <EditorTabs />
      {children}
    </div>
  );
}
