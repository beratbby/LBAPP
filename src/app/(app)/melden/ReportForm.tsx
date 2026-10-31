"use client";

import { useState } from "react";
import { createReport } from "@/lib/actions/reports";
import type { MemberLite, Rule } from "@/lib/data";
import { ActionForm } from "@/components/ActionForm";
import { Avatar } from "@/components/Avatar";
import { ImageInput } from "@/components/ImageInput";
import { SubmitButton } from "@/components/SubmitButton";

export function ReportForm({
  members,
  rules,
  meId,
  preselected,
}: {
  members: MemberLite[];
  rules: Rule[];
  meId: number;
  preselected?: number;
}) {
  const [accused, setAccused] = useState<number | undefined>(preselected);
  const [rule, setRule] = useState<number | undefined>();

  return (
    <ActionForm action={createReport} className="space-y-5">
      <section className="card">
        <h2 className="mb-3 font-extrabold">1. Wer war&apos;s? 👀</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {members.map((m) => (
            <label
              key={m.id}
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl p-2 text-center text-xs font-bold transition ${
                accused === m.id ? "bg-rose/10 ring-2 ring-rose" : "bg-blush/40 hover:bg-blush"
              }`}
            >
              <input
                type="radio"
                name="accused_id"
                value={m.id}
                checked={accused === m.id}
                onChange={() => setAccused(m.id)}
                className="sr-only"
                required
              />
              <Avatar member={m} />
              <span className="line-clamp-1">{m.id === meId ? "Ich selbst 🙈" : m.display_name}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 font-extrabold">2. Welche Regel? 📜</h2>
        <div className="space-y-2">
          {rules.map((r) => (
            <label
              key={r.id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl p-3 transition ${
                rule === r.id ? "bg-rose/10 ring-2 ring-rose" : "bg-blush/40 hover:bg-blush"
              }`}
            >
              <input
                type="radio"
                name="rule_id"
                value={r.id}
                checked={rule === r.id}
                onChange={() => setRule(r.id)}
                className="sr-only"
                required
              />
              <span className="text-2xl">{r.emoji}</span>
              <span className="flex-1">
                <span className="block font-bold">{r.title}</span>
                <span className="block text-xs text-wine-soft">{r.description}</span>
              </span>
              <span className="chip">+{r.points}</span>
            </label>
          ))}
          {rules.length === 0 && <p className="text-sm text-wine-soft">Der Kodex ist noch leer.</p>}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-extrabold">3. Tathergang (optional) 🕵️</h2>
        <textarea
          name="description"
          rows={3}
          maxLength={600}
          className="input"
          placeholder="z. B. Hat um 20:00 'bin gleich da' geschrieben und kam um 20:47."
        />
        <ImageInput name="evidence" label="Beweisfoto anhängen" />
      </section>

      <SubmitButton className="btn btn-primary w-full py-3 text-base" pendingText="Wird aktenkundig…">
        {accused === meId ? "Selbstanzeige erstatten 🙈" : "Anzeige erstatten 🚨"}
      </SubmitButton>
    </ActionForm>
  );
}
