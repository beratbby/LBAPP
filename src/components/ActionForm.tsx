"use client";

import { createContext, startTransition, useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/lib/actions/types";

export const PendingContext = createContext(false);

/**
 * Formular für Server Actions, das Fehler und Erfolgsmeldungen anzeigt.
 * Anders als <form action={...}> setzt es die Eingaben bei einem Fehler NICHT zurück.
 */
export function ActionForm({
  action,
  children,
  className = "space-y-3",
  resetOnSuccess = false,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <PendingContext value={pending}>{children}</PendingContext>
      {state?.error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
          💔 {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          💚 {state.ok}
        </p>
      )}
    </form>
  );
}
