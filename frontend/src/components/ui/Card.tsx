import type { HTMLAttributes } from "react";

/**
 * Atom: the standard surface. One radius/border/background definition so cards
 * stop drifting apart. Pass `className` to add padding/shadow per context.
 */
export default function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-3xl border border-line bg-white ${className}`}
      {...props}
    />
  );
}
