import type { Metadata } from "next";
import { siteConfig } from "@/config";
import { Card, Page } from "@/components/Card";

export const metadata: Metadata = { title: "Información sobre privacidad" };

/** Marca visible los datos que aún faltan por completar. */
function Pending({ value, label }: { value: string; label: string }) {
  if (value) return <>{value}</>;
  return (
    <mark className="rounded bg-yellow-100 px-1 text-ink">[pendiente de completar: {label}]</mark>
  );
}

export default function Privacidad() {
  return (
    <Page>
      <Card>
        <h1 className="text-2xl sm:text-3xl">Información sobre privacidad</h1>
        <p className="mt-3 rounded-md bg-yellow-50 px-4 py-3 text-sm text-muted">
          Borrador pendiente de revisión legal antes de su publicación.
        </p>

        <div className="mt-6 space-y-6 [&_h2]:mb-1 [&_h2]:text-lg">
          <section>
            <h2>Responsable del tratamiento</h2>
            <p>
              <Pending value={siteConfig.organization} label="nombre de la institución responsable" />
              . Contacto:{" "}
              <Pending value={siteConfig.contactEmail} label="email de contacto" />.
            </p>
          </section>
          <section>
            <h2>Qué datos recogemos</h2>
            <p>
              Las respuestas del cuestionario (sobre la gestión del almacén de su empresa), el nombre y
              cargo de la persona que lo rellena y el nombre de la empresa asociado a su enlace
              personal. No recogemos datos de navegación con fines publicitarios.
            </p>
          </section>
          <section>
            <h2>Para qué los usamos</h2>
            <p>
              Para realizar un estudio sobre la gestión de almacenes en pymes y analizar de forma
              agregada las necesidades del sector.
            </p>
          </section>
          <section>
            <h2>Base jurídica</h2>
            <p>Su consentimiento, que se da al marcar la casilla antes de enviar el cuestionario.</p>
          </section>
          <section>
            <h2>Conservación y destinatarios</h2>
            <p>
              <Pending value="" label="plazo de conservación y encargados del tratamiento (p. ej. proveedor de la hoja de cálculo y de alojamiento)" />
            </p>
          </section>
          <section>
            <h2>Sus derechos</h2>
            <p>
              Puede solicitar el acceso, la rectificación o la supresión de sus datos, y retirar su
              consentimiento, escribiendo a{" "}
              <Pending value={siteConfig.contactEmail} label="email de contacto" />. También puede
              reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).
            </p>
          </section>
        </div>
      </Card>
    </Page>
  );
}
