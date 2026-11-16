import { Suspense } from "react";
import { Card, Page as Shell } from "@/components/Card";
import { AlreadySubmitted, InvalidLink } from "@/components/Messages";
import { Questionnaire } from "@/components/Questionnaire";
import { getStore, isValidTokenFormat } from "@/lib/store";

export default function Page({ params }: { params: Promise<{ token: string }> }) {
  // Los parámetros y la lectura de la hoja se resuelven en cada petición: va dentro de Suspense.
  return (
    <Suspense
      fallback={
        <Shell>
          <Card>
            <p role="status">Cargando el cuestionario…</p>
          </Card>
        </Shell>
      }
    >
      <Gate params={params} />
    </Suspense>
  );
}

async function Gate({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isValidTokenFormat(token)) return <InvalidLink />;

  const company = await getStore().getCompany(token);
  if (!company) return <InvalidLink />;
  if (company.respondidoEn) return <AlreadySubmitted />;

  return <Questionnaire token={token} empresa={company.empresa} />;
}
