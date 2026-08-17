"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveMetaAdsSettingsAction } from "./actions";

export function MetaAdsSettingsCard({
  initialPixelId,
  hasAccessToken,
  initialTestEventCode,
  initialTrackingEnabled,
}: {
  initialPixelId: string;
  hasAccessToken: boolean;
  initialTestEventCode: string;
  initialTrackingEnabled: boolean;
}) {
  const router = useRouter();
  const [pixelId, setPixelId] = useState(initialPixelId);
  const [accessToken, setAccessToken] = useState("");
  const [testEventCode, setTestEventCode] = useState(initialTestEventCode);
  const [trackingEnabled, setTrackingEnabled] = useState(initialTrackingEnabled);
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    setSalvando(true);
    const resultado = await saveMetaAdsSettingsAction({
      pixelId,
      accessToken,
      testEventCode,
      trackingEnabled,
    });
    setSalvando(false);

    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }

    toast.success("Configuração do Meta salva.");
    setAccessToken("");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Meta Ads (Pixel + Conversions API)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-xs text-muted-foreground">
          Pixel e token do Meta da própria Beloo — usados pra medir o funil anúncio → cadastro →
          assinatura paga. Não tem relação com nenhuma configuração de loja individual.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="pixel-id">Pixel ID</Label>
          <Input
            id="pixel-id"
            value={pixelId}
            disabled={salvando}
            onChange={(e) => setPixelId(e.target.value)}
            placeholder="123456789012345"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="access-token">Access Token da Conversions API</Label>
          <Input
            id="access-token"
            type="password"
            autoComplete="off"
            value={accessToken}
            disabled={salvando}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder={hasAccessToken ? "•••••••••••• (configurado — deixe em branco pra manter)" : "Cole o token aqui"}
          />
          <p className="text-xs text-muted-foreground">
            Fica salvo criptografado e nunca é mostrado de volta. Deixe em branco pra manter o token
            atual.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="test-event-code">Test Event Code (opcional)</Label>
          <Input
            id="test-event-code"
            value={testEventCode}
            disabled={salvando}
            onChange={(e) => setTestEventCode(e.target.value)}
            placeholder="TEST12345"
          />
          <p className="text-xs text-muted-foreground">
            Só pra validar no Events Manager durante testes — remova antes de anunciar de verdade.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <Label htmlFor="tracking-enabled" className="text-sm font-medium text-foreground">
              Rastreamento ativo
            </Label>
            <p className="text-xs text-muted-foreground">
              Desligado, o Pixel não carrega em nenhuma página e nenhum evento é mandado pra CAPI.
            </p>
          </div>
          <Switch
            id="tracking-enabled"
            checked={trackingEnabled}
            disabled={salvando}
            onCheckedChange={setTrackingEnabled}
          />
        </div>

        <Button className="w-full" disabled={salvando} onClick={handleSalvar}>
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </CardContent>
    </Card>
  );
}
