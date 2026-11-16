"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { siteConfig } from "@/config";
import { sections } from "@/data/questionnaire";
import {
  isAnswered,
  validateQuestion,
  visibleQuestions,
  type Answers,
  type Errors,
} from "@/lib/validate";
import { Card, Page } from "./Card";
import { AlreadySubmitted, Thanks } from "./Messages";
import { QuestionField } from "./QuestionField";

type Draft = { answers: Answers; step: number };
type Status = "editing" | "sending" | "done" | "already";

const TOTAL_STEPS = sections.length + 1; // secciones + revisión y envío
const REVIEW_STEP = sections.length + 1;

const storageKey = (token: string) => `gest-innovacion:v2:${token}`;

function readDraft(token: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(storageKey(token));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    if (typeof parsed.step !== "number" || typeof parsed.answers !== "object") return null;
    return parsed;
  } catch {
    return null; // sin almacenamiento disponible: el formulario funciona igual
  }
}

function writeDraft(token: string, draft: Draft | null): void {
  try {
    if (draft) window.localStorage.setItem(storageKey(token), JSON.stringify(draft));
    else window.localStorage.removeItem(storageKey(token));
  } catch {
    // modo privado o almacenamiento bloqueado: se ignora
  }
}

const primaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-md bg-navy px-6 py-3 text-base font-semibold text-white " +
  "transition-colors hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-md border-2 border-navy bg-white px-5 py-3 " +
  "text-base font-semibold text-navy transition-colors hover:bg-navy-soft disabled:opacity-60";

export function Questionnaire({ token, empresa }: { token: string; empresa: string }) {
  const [step, setStep] = useState(0); // 0 = bienvenida
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Errors>({});
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("editing");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Draft | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastView = useRef({ step: 0, status: "editing" as Status });

  // Borrador guardado en este dispositivo (se lee tras montar para no romper la hidratación).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura de localStorage solo disponible en cliente
    setSaved(readDraft(token));
  }, [token]);

  // Autoguardado mientras se rellena.
  useEffect(() => {
    if (step > 0 && status === "editing") writeDraft(token, { answers, step });
  }, [token, answers, step, status]);

  // Al cambiar de paso: arriba del todo y foco en el título (útil con lector de pantalla).
  useEffect(() => {
    // Solo cuando cambia de verdad la vista (no al montar ni en el doble efecto de StrictMode).
    if (lastView.current.step === step && lastView.current.status === status) return;
    lastView.current = { step, status };
    window.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, [step, status]);

  const change = useCallback((id: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => {
      if (!(id in prev)) return prev;
      const rest = { ...prev };
      delete rest[id];
      return rest;
    });
  }, []);

  if (status === "done") return <Thanks empresa={empresa} />;
  if (status === "already") return <AlreadySubmitted />;

  const section = step >= 1 && step <= sections.length ? sections[step - 1] : null;
  const visible = visibleQuestions(answers);
  const numberOf = (id: string) => visible.findIndex((q) => q.id === id) + 1;
  const answeredCount = visible.filter((q) => q.required !== false && isAnswered(q, answers)).length;
  const requiredCount = visible.filter((q) => q.required !== false).length;

  function validateSection(index: number): Errors {
    const found: Errors = {};
    for (const q of sections[index].questions) {
      if (!visible.some((v) => v.id === q.id)) continue;
      const error = validateQuestion(q, answers);
      if (error) found[q.id] = error;
    }
    return found;
  }

  function focusFirstError(found: Errors) {
    const firstId = Object.keys(found)[0];
    if (!firstId) return;
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-question="${firstId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.querySelector<HTMLElement>("input, textarea")?.focus({ preventScroll: true });
    });
  }

  function next() {
    if (section) {
      const found = validateSection(step - 1);
      if (Object.keys(found).length > 0) {
        setErrors(found);
        focusFirstError(found);
        return;
      }
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, REVIEW_STEP));
  }

  function back() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  }

  async function submit() {
    setSubmitError(null);
    if (!consent) {
      setSubmitError("Para enviar el cuestionario, marque la casilla de aceptación.");
      return;
    }
    // Revalida todo por si se restauró un borrador antiguo.
    for (let i = 0; i < sections.length; i++) {
      const found = validateSection(i);
      if (Object.keys(found).length > 0) {
        setErrors(found);
        setStep(i + 1);
        setSubmitError("Faltan algunas respuestas. Las hemos marcado.");
        focusFirstError(found);
        return;
      }
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, answers, consent }),
      });
      if (res.ok) {
        writeDraft(token, null);
        setStatus("done");
        return;
      }
      if (res.status === 409) {
        writeDraft(token, null);
        setStatus("already");
        return;
      }
      if (res.status === 422) {
        const data = (await res.json().catch(() => ({}))) as { errors?: Errors };
        if (data.errors) {
          setErrors(data.errors);
          const firstId = Object.keys(data.errors)[0];
          const idx = sections.findIndex((s) => s.questions.some((q) => q.id === firstId));
          if (idx >= 0) setStep(idx + 1);
          focusFirstError(data.errors);
        }
        setSubmitError("Revise las respuestas marcadas y vuelva a enviar.");
      } else {
        setSubmitError(
          "No hemos podido enviar el cuestionario. Sus respuestas siguen guardadas en este dispositivo: inténtelo de nuevo en unos minutos.",
        );
      }
    } catch {
      setSubmitError(
        "No hemos podido conectar. Compruebe su conexión: sus respuestas siguen guardadas en este dispositivo.",
      );
    }
    setStatus("editing");
  }

  // ---------- Bienvenida ----------
  if (step === 0) {
    const hasDraft = saved !== null && (saved.step > 0 || Object.keys(saved.answers).length > 0);
    return (
      <Page>
        <Card>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl outline-none sm:text-3xl">
            {siteConfig.formName}
          </h1>
          <p className="mt-4 rounded-md bg-navy-soft px-4 py-3">
            Este enlace corresponde a la empresa <strong>{empresa}</strong>.
          </p>
          <ul className="mt-5 space-y-3">
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-gold">◆</span>
              <span>
                Le llevará unos <strong>{siteConfig.estimatedMinutes} minutos</strong>. No hay
                respuestas correctas ni incorrectas.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-gold">◆</span>
              <span>
                Si no está seguro, elija <strong>la opción que más se acerque</strong>. Basta con
                una estimación.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-gold">◆</span>
              <span>
                Puede parar cuando quiera: <strong>sus respuestas se guardan solas</strong> en este
                dispositivo y podrá continuar abriendo de nuevo este mismo enlace.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-gold">◆</span>
              <span>
                Solo se puede enviar <strong>una vez por empresa</strong>.
              </span>
            </li>
          </ul>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            {hasDraft && saved ? (
              <>
                <button
                  type="button"
                  className={primaryButton}
                  onClick={() => {
                    setAnswers(saved.answers);
                    setStep(Math.min(Math.max(saved.step, 1), REVIEW_STEP));
                  }}
                >
                  Continuar donde lo dejé
                </button>
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => {
                    writeDraft(token, null);
                    setSaved(null);
                    setAnswers({});
                    setStep(1);
                  }}
                >
                  Empezar de nuevo
                </button>
              </>
            ) : (
              <button type="button" className={primaryButton} onClick={() => setStep(1)}>
                Empezar
              </button>
            )}
          </div>
        </Card>
      </Page>
    );
  }

  // ---------- Pasos con preguntas y revisión ----------
  const percent = Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100);
  const stepTitle = section ? section.title : "Revisar y enviar";

  return (
    <>
      <Page>
        <div className="mb-6" aria-live="polite">
          <p className="text-sm font-medium text-muted">
            Paso {step} de {TOTAL_STEPS}
          </p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Progreso del cuestionario"
          >
            <div className="h-full bg-navy transition-[width]" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <h1 ref={headingRef} tabIndex={-1} className="text-2xl outline-none sm:text-3xl">
          {stepTitle}
        </h1>
        {section?.intro && <p className="mt-2 text-muted">{section.intro}</p>}

        {section && (
          <div className="mt-6 space-y-4 pb-24">
            {section.questions
              .filter((q) => visible.some((v) => v.id === q.id))
              .map((q) => (
                <QuestionField
                  key={q.id}
                  question={q}
                  number={numberOf(q.id)}
                  answers={answers}
                  error={errors[q.id]}
                  onChange={change}
                />
              ))}
            {Object.keys(errors).length > 0 && (
              <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 font-medium text-danger">
                Hay preguntas sin responder. Están marcadas en rojo.
              </p>
            )}
          </div>
        )}

        {step === REVIEW_STEP && (
          <div className="mt-6 pb-24">
            <Card>
              <p>
                Ha respondido a <strong>{answeredCount}</strong> de las{" "}
                <strong>{requiredCount}</strong> preguntas obligatorias. Puede volver atrás para
                revisar sus respuestas antes de enviarlas.
              </p>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-md border-2 border-line p-4 has-[:checked]:border-navy has-[:checked]:bg-navy-soft">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    setSubmitError(null);
                  }}
                  className="mt-1 h-5 w-5 shrink-0 accent-navy"
                />
                <span>
                  He leído la{" "}
                  <Link
                    href="/privacidad"
                    target="_blank"
                    className="underline underline-offset-2"
                  >
                    información sobre privacidad
                  </Link>{" "}
                  y acepto que se traten mis respuestas para este estudio.
                </span>
              </label>
              {submitError && (
                <p role="alert" className="mt-4 rounded-md bg-danger-soft px-4 py-3 font-medium text-danger">
                  {submitError}
                </p>
              )}
            </Card>
          </div>
        )}
      </Page>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          {step > 1 ? (
            <button
              type="button"
              className={secondaryButton}
              onClick={back}
              disabled={status === "sending"}
            >
              ← Atrás
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          {step < REVIEW_STEP ? (
            <button type="button" className={primaryButton} onClick={next}>
              Siguiente →
            </button>
          ) : (
            <button
              type="button"
              className={primaryButton}
              onClick={submit}
              disabled={status === "sending"}
            >
              {status === "sending" ? "Enviando…" : "Enviar cuestionario"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
