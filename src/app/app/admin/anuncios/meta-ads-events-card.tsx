import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type MetaAdsEventRow = {
  id: string;
  eventName: string;
  businessNome: string | null;
  status: "success" | "error";
  errorMessage: string | null;
  createdAt: string;
};

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export function MetaAdsEventsCard({ eventos }: { eventos: MetaAdsEventRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Últimos eventos enviados</CardTitle>
      </CardHeader>
      <CardContent>
        {eventos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum evento enviado ainda.
          </p>
        ) : (
          <ul>
            {eventos.map((evento) => (
              <li
                key={evento.id}
                className="flex items-start justify-between gap-3 border-b border-border py-2.5 last:border-0"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{evento.eventName}</span>
                    {evento.businessNome ? (
                      <Badge variant="outline" className="text-xs">
                        {evento.businessNome}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatarDataHora(evento.createdAt)}
                  </p>
                  {evento.status === "error" && evento.errorMessage ? (
                    <p className="mt-1 truncate text-xs text-destructive">{evento.errorMessage}</p>
                  ) : null}
                </div>
                <Badge
                  className={
                    evento.status === "success" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                  }
                  variant="secondary"
                >
                  {evento.status === "success" ? "Enviado" : "Falhou"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
