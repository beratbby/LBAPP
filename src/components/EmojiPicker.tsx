"use client";

import { useState } from "react";

const EMOJIS = ["😎", "🤵", "🕺", "🦁", "🐺", "🦊", "🐻", "🐸", "🤠", "👑", "🔥", "💪", "🌹", "💘", "🍷", "🎸", "⚽", "🏀", "🎮", "🚗", "🧢", "🥷", "🤡", "👽"];

export function EmojiPicker({ name, defaultValue = "😎" }: { name: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-8 gap-1.5">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setValue(e)}
            className={`flex aspect-square items-center justify-center rounded-xl text-xl transition ${
              value === e ? "bg-rose/15 ring-2 ring-rose" : "bg-blush/60 hover:bg-blush"
            }`}
            aria-label={`Emoji ${e}`}
            aria-pressed={value === e}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
