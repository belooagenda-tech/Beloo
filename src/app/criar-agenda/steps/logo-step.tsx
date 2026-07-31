"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const MAX_SIZE_MB = 4;

export function LogoStep({
  onSubmit,
  onSkip,
  onBack,
  submitting,
  error,
}: {
  onSubmit: (file: File) => void;
  onSkip: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleFile(selected: File | null) {
    setLocalError(null);
    if (!selected) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!selected.type.startsWith("image/")) {
      setLocalError("Escolha um arquivo de imagem.");
      return;
    }
    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setLocalError(`A imagem precisa ter até ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {localError ? (
        <Alert variant="destructive">
          <AlertDescription>{localError}</AlertDescription>
        </Alert>
      ) : null}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card py-10 text-center transition-colors hover:border-primary/50"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Pré-visualização da logo" className="size-24 rounded-full object-cover" />
        ) : (
          <>
            <ImagePlus className="size-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Toque para escolher uma foto ou logo
            </span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Voltar
        </Button>
        {file ? (
          <Button
            type="button"
            className="flex-1"
            disabled={submitting}
            onClick={() => onSubmit(file)}
          >
            {submitting ? "Enviando..." : "Continuar"}
          </Button>
        ) : (
          <Button type="button" variant="secondary" className="flex-1" onClick={onSkip}>
            Pular por agora
          </Button>
        )}
      </div>
    </div>
  );
}
