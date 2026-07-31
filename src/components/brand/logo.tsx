import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-8", className)}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="16" className="fill-primary" />
      <path
        d="M18 15a3 3 0 0 1 3-3h20a3 3 0 0 1 3 3v3H18v-3Z"
        fill="white"
        fillOpacity="0.35"
      />
      <rect x="14" y="18" width="36" height="31" rx="6" fill="white" />
      <path d="M14 27h36" className="stroke-primary" strokeWidth="2.5" />
      <rect x="20" y="10" width="3.4" height="10" rx="1.7" fill="white" />
      <rect x="40.6" y="10" width="3.4" height="10" rx="1.7" fill="white" />
      <path
        d="M23 36.5l5.2 5.2L42 27.5"
        className="stroke-primary"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span className="font-heading text-xl font-semibold tracking-tight text-foreground">
        beloo
      </span>
    </span>
  );
}
