import { cn } from "@/lib/utils";

type LogoProps = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
};

/**
 * iuria mark — editorial typographic identity.
 *
 * The icon is a vertical stem ("the column of law") with a small detached
 * square "tittle" above it. Reads as a stylized lowercase i. Distinctive
 * at any size, recognizable at 16px, monochrome cinnabar — no gradients,
 * no AI shimmer. The wordmark is set in Fraunces, an editorial serif,
 * because legal practice IS editorial work.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      {/* tittle (the dot of i, reimagined as a square mark) */}
      <rect x="13" y="5" width="6" height="6" rx="0.5" fill="hsl(var(--primary))" />
      {/* stem */}
      <rect x="14" y="14" width="4" height="14" rx="0.5" fill="currentColor" />
    </svg>
  );
}

export function Logo({ size = 28, showWordmark = true, className }: LogoProps) {
  return (
    <div
      className={cn("inline-flex items-center gap-2.5 text-foreground", className)}
      data-testid="brand-logo"
    >
      <LogoMark size={size} />
      {showWordmark && (
        <span
          className="font-display font-medium text-foreground"
          style={{
            fontSize: size * 0.78,
            letterSpacing: "-0.025em",
            lineHeight: 1,
          }}
        >
          iuria
        </span>
      )}
    </div>
  );
}
