"use client";

import { useContext } from "react";
import { useFormStatus } from "react-dom";
import { PendingContext } from "./ActionForm";

export function SubmitButton({
  children,
  pendingText,
  className = "btn btn-primary",
  confirm,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string; confirm?: string }) {
  const status = useFormStatus();
  const ctxPending = useContext(PendingContext);
  const pending = status.pending || ctxPending;
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      {...rest}
    >
      {pending ? (pendingText ?? "…") : children}
    </button>
  );
}
