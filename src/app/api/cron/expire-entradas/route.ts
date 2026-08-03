import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: expirados } = await admin
    .from("appointments")
    .update({ status: "cancelado", entrada_status: "expirado" })
    .eq("status", "aguardando_pagamento")
    .lt("entrada_expira_em", now)
    .select("id");

  return NextResponse.json({ ok: true, expirados: expirados?.length ?? 0 });
}
