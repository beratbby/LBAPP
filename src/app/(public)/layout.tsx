import { LogoMark, SLOGAN, Wordmark } from "@/components/Logo";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <LogoMark size={96} className="wobble" />
        <h1 className="mt-3 text-5xl">
          <Wordmark />
        </h1>
        <p className="mt-2 text-sm font-semibold tracking-wide text-wine-soft italic">{SLOGAN}</p>
      </div>
      {children}
      <p className="mt-8 text-center text-xs text-wine-soft/70">
        Zutritt nur für LoverBoys. Herzen werden hier gebrochen, nicht gestohlen.
      </p>
    </main>
  );
}
