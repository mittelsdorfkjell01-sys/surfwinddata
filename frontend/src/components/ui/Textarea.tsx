import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";
import { fieldClass } from "./fieldClass";

/** Atom: multi-line text input. Shares the field token + focus ring. */
const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = "", ...props }, ref) => (
  <textarea ref={ref} className={`${fieldClass} ${className}`} {...props} />
));
Textarea.displayName = "Textarea";
export default Textarea;
