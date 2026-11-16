import { siteConfig } from "@/config";
import { Card, Page } from "@/components/Card";

export default function Home() {
  return (
    <Page>
      <Card>
        <h1 className="text-2xl sm:text-3xl">{siteConfig.formName}</h1>
        <p className="mt-4">
          Para rellenar el cuestionario, use el <strong>enlace personal</strong> que le enviamos por
          correo electrónico. Cada empresa tiene el suyo.
        </p>
        <p className="mt-3 text-muted">
          Si no encuentra el correo, revise la carpeta de spam
          {siteConfig.contactEmail ? (
            <>
              {" "}
              o escríbanos a{" "}
              <a className="underline" href={`mailto:${siteConfig.contactEmail}`}>
                {siteConfig.contactEmail}
              </a>
            </>
          ) : null}
          .
        </p>
      </Card>
    </Page>
  );
}
