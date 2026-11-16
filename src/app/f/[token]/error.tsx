"use client";

import { Card, Page } from "@/components/Card";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <Page>
      <Card>
        <h1 className="text-2xl">No hemos podido cargar el cuestionario</h1>
        <p className="mt-4">Ha habido un problema temporal. Inténtelo de nuevo en unos minutos.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex min-h-12 items-center rounded-md bg-navy px-6 py-3 font-semibold text-white hover:bg-navy-dark"
        >
          Reintentar
        </button>
      </Card>
    </Page>
  );
}
