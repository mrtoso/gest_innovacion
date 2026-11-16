import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { siteConfig } from "@/config";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: siteConfig.formName, template: `%s · ${siteConfig.studyName}` },
  description: "Cuestionario sobre la gestión de almacenes en pequeñas y medianas empresas.",
  // Páginas privadas por enlace personal: que no se indexen.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b2f5b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full">
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-navy"
        >
          Saltar al contenido
        </a>

        <header className="border-b-4 border-gold bg-navy text-white">
          <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4">
            <span
              aria-hidden="true"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-white/40 font-serif text-xl"
            >
              GA
            </span>
            <div className="min-w-0">
              {siteConfig.organization && (
                <p className="text-xs uppercase tracking-widest text-white/75">
                  {siteConfig.organization}
                </p>
              )}
              <p className="font-serif text-lg leading-snug sm:text-xl">{siteConfig.studyName}</p>
            </div>
          </div>
        </header>

        <div id="contenido" className="flex-1">
          {children}
        </div>

        <footer className="border-t border-line bg-white">
          <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-5 text-sm text-muted">
            <p>Sus respuestas se tratan de forma confidencial.</p>
            <nav className="flex gap-5" aria-label="Información legal">
              <Link href="/privacidad" className="underline underline-offset-2 hover:text-navy">
                Privacidad
              </Link>
              {siteConfig.contactEmail && (
                <a
                  href={`mailto:${siteConfig.contactEmail}`}
                  className="underline underline-offset-2 hover:text-navy"
                >
                  Contacto
                </a>
              )}
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
