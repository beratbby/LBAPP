"use client";

import { useRef, useState } from "react";

const MAX_SIDE = 1280;

async function shrink(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Bild-Upload, der Fotos vor dem Hochladen im Browser verkleinert. */
export function ImageInput({ name, label = "Foto wählen" }: { name: string; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    setBusy(true);
    try {
      const small = await shrink(file);
      if (small !== file) {
        const dt = new DataTransfer();
        dt.items.add(small);
        input.files = dt.files;
      }
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(small);
      });
    } catch {
      // Dann eben das Original hochladen.
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    if (ref.current) ref.current.value = "";
    setPreview(null);
  }

  return (
    <div className="space-y-2">
      <label className="btn btn-ghost btn-sm cursor-pointer">
        📸 {busy ? "Wird verkleinert…" : label}
        <input ref={ref} type="file" name={name} accept="image/*" className="sr-only" onChange={onChange} />
      </label>
      {preview && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Vorschau" className="max-h-48 rounded-2xl border border-petal" />
          <button type="button" onClick={clear} className="btn btn-ghost btn-sm absolute top-2 right-2">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
