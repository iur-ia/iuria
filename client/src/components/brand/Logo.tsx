import { cn } from "@/lib/utils";

type LogoProps = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
};

export function Logo({ size = 28, showWordmark = true, className }: LogoProps) {
  return (
    <div
      className={cn("inline-flex items-center gap-2.5", className)}
      data-testid="brand-logo"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="iuria-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(252 100% 70%)" />
            <stop offset="100%" stopColor="hsl(188 88% 53%)" />
          </linearGradient>
        </defs>
        <rect x="14" y="6" width="8" height="24" rx="2" fill="url(#iuria-grad)" />
        <circle cx="18" cy="2.5" r="2.5" fill="hsl(252 100% 70%)" />
      </svg>
      {showWordmark && (
        <span
          className="font-semibold tracking-tight text-foreground"
          style={{ fontSize: size * 0.72, letterSpacing: "-0.03em" }}
        >
          iuria
        </span>
      )}
    </div>
  );
}

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return <Logo size={size} showWordmark={false} className={className} />;
}
