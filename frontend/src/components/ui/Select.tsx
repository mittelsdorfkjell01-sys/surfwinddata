import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { fieldClass } from "./fieldClass";

/** Atom: native select. Shares the field token + focus ring. */
const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className = "", children, ...props }, ref) => (
  <select ref={ref} className={`${fieldClass} ${className}`} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";
export default Select;
