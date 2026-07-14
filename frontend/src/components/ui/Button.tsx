import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const VARIANT: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-navy-dark",
  secondary: "bg-white text-navy ring-1 ring-navy/20 hover:ring-navy/40",
  ghost: "border border-navy/20 bg-white text-navy hover:bg-navy/5",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-label",
  md: "px-4 py-2 text-ui",
};

/** Atom: button. Keyboard focus is handled by the global :focus-visible token. */
const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(({ variant = "primary", size = "md", type = "button", className = "", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    {...props}
  />
));
Button.displayName = "Button";
export default Button;
