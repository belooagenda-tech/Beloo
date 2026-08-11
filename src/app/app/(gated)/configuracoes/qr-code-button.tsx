"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode as QrCodeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Gerado 100% local (pacote "qrcode", sem chamada de rede) — o link da
// agenda do profissional nunca é enviado a um serviço terceiro só para
// desenhar o código. Esse componente é carregado sob demanda a partir de
// Configurações (ver next/dynamic no page.tsx), então o resto do app não
// paga o peso da biblioteca.
export function QrCodeButton({ url, nomeLoja }: { url: string; nomeLoja: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    setError(false);
    QRCode.toCanvas(canvasRef.current, url, { width: 220, margin: 1 }).catch(() => setError(true));
  }, [open, url]);

  async function handleDownload() {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, { width: 800, margin: 2 });
      const qrImg = new Image();
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => reject(new Error("Falha ao carregar o QR code gerado"));
        qrImg.src = qrDataUrl;
      });

      // Canvas maior, com o nome da loja escrito embaixo — pronto pra
      // imprimir e deixar exposto no balcão, sem precisar editar a imagem.
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 920;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas não suportado");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(qrImg, 0, 0, 800, 800);
      ctx.fillStyle = "#111111";
      ctx.font = "bold 34px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Agende com ${nomeLoja}`, 400, 862);
      ctx.font = "24px sans-serif";
      ctx.fillStyle = "#666666";
      ctx.fillText("Aponte a câmera do celular para o QR Code", 400, 898);

      const link = document.createElement("a");
      link.download = `qrcode-${nomeLoja.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      setError(true);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <QrCodeIcon className="size-4" />
        QR Code
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code do seu link de agendamento</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {error ? (
              <p className="text-sm text-destructive">
                Não foi possível gerar o QR Code agora. Tente fechar e abrir de novo.
              </p>
            ) : (
              <canvas ref={canvasRef} className="rounded-md border border-border" />
            )}
            <p className="text-center text-sm text-muted-foreground">
              Mostre para o cliente escanear com a câmera do celular, ou baixe para imprimir e
              deixar exposto na sua loja.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" className="w-full" onClick={handleDownload} disabled={error}>
              <Download className="size-4" />
              Baixar para imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
