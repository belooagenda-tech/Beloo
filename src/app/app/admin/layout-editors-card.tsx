"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  searchProfilesByEmailAction,
  setLayoutEditorAction,
  type LayoutEditorProfile,
} from "./actions";

type Row = LayoutEditorProfile & { isLayoutEditor: boolean };

// Concede/revoga acesso à aba Editor (layout visual) por usuário — quem tem
// is_layout_editor = true vê a aba /app/editor, mas só quem é is_admin
// consegue publicar de lá (ver src/app/app/editor/actions.ts).
export function LayoutEditorsCard({ initialEditors }: { initialEditors: LayoutEditorProfile[] }) {
  const [rows, setRows] = useState<Row[]>(
    initialEditors.map((p) => ({ ...p, isLayoutEditor: true })),
  );
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();

  function upsertRow(profile: LayoutEditorProfile, isLayoutEditor: boolean) {
    setRows((prev) => {
      const exists = prev.some((r) => r.id === profile.id);
      if (exists) {
        return prev.map((r) => (r.id === profile.id ? { ...r, isLayoutEditor } : r));
      }
      return [...prev, { ...profile, isLayoutEditor }];
    });
  }

  function handleSearch() {
    startSearch(async () => {
      const resultado = await searchProfilesByEmailAction(query);
      if (!resultado.ok) {
        toast.error(resultado.error);
        return;
      }
      if (resultado.profiles.length === 0) {
        toast.info("Nenhum usuário encontrado com esse e-mail.");
        return;
      }
      setRows((prev) => {
        const knownIds = new Set(prev.map((r) => r.id));
        const novas = resultado.profiles
          .filter((p) => !knownIds.has(p.id))
          .map((p) => ({ ...p, isLayoutEditor: false }));
        return [...prev, ...novas];
      });
    });
  }

  async function handleToggle(profile: Row, checked: boolean) {
    setPending(profile.id);
    upsertRow(profile, checked);
    const resultado = await setLayoutEditorAction({ profileId: profile.id, isLayoutEditor: checked });
    setPending(null);

    if (!resultado.ok) {
      upsertRow(profile, !checked);
      toast.error(resultado.error);
      return;
    }
    toast.success(
      checked ? `${profile.nome} agora edita o layout.` : `Acesso de ${profile.nome} revogado.`,
    );
  }

  // Editores atuais primeiro, resultados de busca sem acesso depois.
  const ordenadas = [...rows].sort((a, b) => Number(b.isLayoutEditor) - Number(a.isLayoutEditor));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Acesso ao Editor Visual</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Quem tem acesso vê a aba &quot;Editor&quot; e pode montar rascunhos de layout — só o admin
          publica.
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="Buscar por e-mail (ex. cleyton@...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button variant="outline" disabled={isSearching} onClick={handleSearch}>
            Buscar
          </Button>
        </div>

        {ordenadas.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum editor ainda. Busque um usuário pelo e-mail acima.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {ordenadas.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{row.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.email ?? "—"}</p>
                </div>
                <Switch
                  checked={row.isLayoutEditor}
                  disabled={pending === row.id}
                  onCheckedChange={(checked) => handleToggle(row, checked)}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
