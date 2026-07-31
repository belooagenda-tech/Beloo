import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
            <Icon className="size-6 text-secondary-foreground" />
          </div>
          <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
