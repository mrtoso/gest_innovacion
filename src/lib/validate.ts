import {
  allQuestions,
  hasOther,
  otherKey,
  type Question,
} from "../data/questionnaire";

/** Respuestas: selección única/texto/número/escala → string; multi → string[]. */
export type Answers = Record<string, string | string[]>;
export type Errors = Record<string, string>;

const DEFAULT_TEXT_MAX = 200;
const DEFAULT_TEXTAREA_MAX = 2000;
const OTHER_MAX = 200;

export function textValue(answers: Answers, id: string): string {
  const v = answers[id];
  return typeof v === "string" ? v : "";
}

export function listValue(answers: Answers, id: string): string[] {
  const v = answers[id];
  return Array.isArray(v) ? v : [];
}

export function isVisible(q: Question, answers: Answers): boolean {
  if (!q.showIf) return true;
  const dependency = textValue(answers, q.showIf.questionId);
  // Mientras no se haya respondido la pregunta de la que depende, no se muestra.
  return dependency !== "" && dependency !== q.showIf.notEquals;
}

export function visibleQuestions(answers: Answers): Question[] {
  return allQuestions.filter((q) => isVisible(q, answers));
}

export function isAnswered(q: Question, answers: Answers): boolean {
  if (q.type === "multi") return listValue(answers, q.id).length > 0;
  return textValue(answers, q.id).trim() !== "";
}

export function parseNumber(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Devuelve un mensaje de error para la pregunta, o null si es válida. */
export function validateQuestion(q: Question, answers: Answers): string | null {
  const required = q.required !== false;
  const answered = isAnswered(q, answers);

  if (!answered) return required ? "Falta responder esta pregunta." : null;

  switch (q.type) {
    case "single": {
      const value = textValue(answers, q.id);
      const option = q.options.find((o) => o.label === value);
      if (!option) return "Respuesta no válida.";
      if (option.other) return validateOther(q, answers);
      return null;
    }
    case "multi": {
      const values = listValue(answers, q.id);
      const selected = values.map((v) => q.options.find((o) => o.label === v));
      if (selected.some((o) => !o) || new Set(values).size !== values.length) {
        return "Respuesta no válida.";
      }
      if (selected.some((o) => o?.exclusive) && values.length > 1) {
        return "Esta opción no se puede combinar con las demás.";
      }
      if (selected.some((o) => o?.other)) return validateOther(q, answers);
      return null;
    }
    case "text": {
      const max = q.maxLength ?? DEFAULT_TEXT_MAX;
      return textValue(answers, q.id).length > max ? `Máximo ${max} caracteres.` : null;
    }
    case "textarea": {
      const max = q.maxLength ?? DEFAULT_TEXTAREA_MAX;
      return textValue(answers, q.id).length > max ? `Máximo ${max} caracteres.` : null;
    }
    case "number": {
      const n = parseNumber(textValue(answers, q.id));
      if (n === null) return "Escriba solo un número (por ejemplo, 250).";
      if (q.max !== undefined && n > q.max) return "El número es demasiado grande.";
      return null;
    }
    case "scale": {
      const n = Number(textValue(answers, q.id));
      return Number.isInteger(n) && n >= q.min && n <= q.max ? null : "Respuesta no válida.";
    }
  }
}

function validateOther(q: Question, answers: Answers): string | null {
  const text = textValue(answers, otherKey(q.id)).trim();
  if (text === "") return "Escriba en el recuadro cuál es.";
  if (text.length > OTHER_MAX) return `Máximo ${OTHER_MAX} caracteres.`;
  return null;
}

/** Valida todas las preguntas visibles. */
export function validateAnswers(answers: Answers): Errors {
  const errors: Errors = {};
  for (const q of visibleQuestions(answers)) {
    const error = validateQuestion(q, answers);
    if (error) errors[q.id] = error;
  }
  return errors;
}

/**
 * Deja solo lo que corresponde a preguntas visibles y conocidas, con tipos correctos.
 * Se usa en el servidor con datos no confiables.
 */
export function sanitizeAnswers(input: unknown): Answers {
  const raw: Record<string, unknown> =
    typeof input === "object" && input !== null && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  const typed: Answers = {};
  for (const q of allQuestions) {
    const v = raw[q.id];
    if (q.type === "multi") {
      if (Array.isArray(v) && v.every((x) => typeof x === "string")) typed[q.id] = v;
    } else if (typeof v === "string") {
      typed[q.id] = v.trim();
    }
    if (hasOther(q)) {
      const other = raw[otherKey(q.id)];
      if (typeof other === "string") typed[otherKey(q.id)] = other.trim();
    }
  }

  const clean: Answers = {};
  for (const q of allQuestions) {
    if (!isVisible(q, typed)) continue;
    if (q.id in typed) clean[q.id] = typed[q.id];
    const selectedOther =
      (q.type === "single" && q.options.some((o) => o.other && o.label === typed[q.id])) ||
      (q.type === "multi" &&
        q.options.some((o) => o.other && listValue(typed, q.id).includes(o.label)));
    if (selectedOther && otherKey(q.id) in typed) clean[otherKey(q.id)] = typed[otherKey(q.id)];
  }
  return clean;
}
