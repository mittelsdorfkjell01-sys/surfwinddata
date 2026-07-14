import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { fieldClass } from "./fieldClass";

/** Atom: single-line text input. Carries the shared field token + focus ring. */
const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={`${fieldClass} ${className}`} {...props} />
  )
);
Input.displayName = "Input";
export default Input;
