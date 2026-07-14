import type { HTMLAttributes } from "react";

/**
 * Atom: the standard surface. One radius/border/background definition so cards
 * stop drifting apart (rounded-lg here, rounded-2xl there). Pass `className`
 * to add padding/shadow per context.
 */
export default function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-line bg-white ${className}`}
      {...props}
    />
  );
}
