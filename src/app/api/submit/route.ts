import { getStore, isValidTokenFormat } from "@/lib/store";
import { sanitizeAnswers, validateAnswers } from "@/lib/validate";

const MAX_BODY_BYTES = 100_000;

function json(body: Record<string, unknown>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "too_large" }, 413);

  let body: { token?: unknown; answers?: unknown; consent?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  const token = typeof body.token === "string" ? body.token : "";
  if (!isValidTokenFormat(token)) return json({ error: "invalid_link" }, 404);

  try {
    const store = getStore();
    const company = await store.getCompany(token);
    if (!company) return json({ error: "invalid_link" }, 404);
    if (company.respondidoEn) return json({ error: "already_submitted" }, 409);

    if (body.consent !== true) return json({ error: "consent_required" }, 422);

    const answers = sanitizeAnswers(body.answers);
    const errors = validateAnswers(answers);
    if (Object.keys(errors).length > 0) return json({ error: "validation", errors }, 422);

    const result = await store.saveResponse(token, answers);
    if (result === "already") return json({ error: "already_submitted" }, 409);
    if (result === "unknown") return json({ error: "invalid_link" }, 404);
    return json({ ok: true }, 200);
  } catch (error) {
    // Nunca se registra el token ni las respuestas (datos personales).
    console.error("Error al guardar la respuesta:", error instanceof Error ? error.message : error);
    return json({ error: "server_error" }, 500);
  }
}
