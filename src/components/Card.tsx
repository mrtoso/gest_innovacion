import type { ReactNode } from "react";

/** Contenedor central de las páginas: ancho de lectura cómodo y margen en móvil. */
export function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">{children}</main>;
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-white p-6 shadow-sm sm:p-8">{children}</div>
  );
}
