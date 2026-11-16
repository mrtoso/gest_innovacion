import { siteConfig } from "@/config";
import { Card, Page } from "./Card";

function Contact() {
  if (!siteConfig.contactEmail) return null;
  return (
    <>
      {" "}
      Si tiene alguna duda, escríbanos a{" "}
      <a className="underline" href={`mailto:${siteConfig.contactEmail}`}>
        {siteConfig.contactEmail}
      </a>
      .
    </>
  );
}

export function InvalidLink() {
  return (
    <Page>
      <Card>
        <h1 className="text-2xl">Este enlace no es válido</h1>
        <p className="mt-4">
          Compruebe que ha copiado el enlace completo del correo que le enviamos.
          <Contact />
        </p>
      </Card>
    </Page>
  );
}

export function AlreadySubmitted() {
  return (
    <Page>
      <Card>
        <h1 className="text-2xl">Ya hemos recibido su respuesta</h1>
        <p className="mt-4">
          Este cuestionario ya se envió desde este enlace. Cada empresa solo puede responder una
          vez. ¡Gracias por su colaboración!
          <Contact />
        </p>
      </Card>
    </Page>
  );
}

export function Thanks({ empresa }: { empresa: string }) {
  return (
    <Page>
      <Card>
        <p aria-hidden="true" className="text-4xl text-ok">
          ✓
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl">¡Gracias por su colaboración!</h1>
        <p className="mt-4">
          Hemos recibido las respuestas de <strong>{empresa}</strong>. Ya puede cerrar esta página.
        </p>
        <p className="mt-3 text-muted">
          Su aportación nos ayuda a entender mejor cómo trabajan los almacenes de las pymes.
          <Contact />
        </p>
      </Card>
    </Page>
  );
}
