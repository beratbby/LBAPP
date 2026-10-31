import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
      <p className="text-6xl">🥀</p>
      <h1 className="mt-3 font-black tracking-tight text-3xl text-rose-dark">404: Hier ist niemand</h1>
      <p className="mt-1 text-sm text-wine-soft">Diese Seite hat dich geghostet.</p>
      <Link href="/" className="btn btn-primary mt-5">Zurück zu den Jungs</Link>
    </main>
  );
}
