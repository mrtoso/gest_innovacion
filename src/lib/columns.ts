import { allQuestions, hasOther, otherKey, QUESTIONNAIRE_VERSION, type Question } from "../data/questionnaire";
import { listValue, parseNumber, textValue, type Answers } from "./validate";

/** Pestaña de respuestas de esta versión del cuestionario. */
export const RESPONSES_TAB = `Respuestas_${QUESTIONNAIRE_VERSION}`;
export const COMPANIES_TAB = "Empresas";

/** Columnas fijas que preceden a las preguntas. `token` DEBE ser la columna C. */
export const FIXED_COLUMNS = ["submitted_at", "questionnaire_version", "token", "empresa"] as const;

/** Cabecera de la hoja, generada desde el cuestionario (no se escribe a mano). */
export function responseHeader(): string[] {
  const columns: string[] = [...FIXED_COLUMNS];
  for (const q of allQuestions) {
    columns.push(q.id);
    if (hasOther(q)) columns.push(otherKey(q.id));
  }
  return columns;
}

/**
 * Evita la inyección de fórmulas al abrir el CSV en Excel/Sheets: el texto libre que
 * empiece por = + - @ (o tabulador / retorno de carro) se prefija con una comilla.
 */
export function neutralizeFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

type Cell = string | number;

function cellFor(q: Question, answers: Answers): Cell {
  switch (q.type) {
    case "multi":
      return listValue(answers, q.id).join(" | ");
    case "number":
      return parseNumber(textValue(answers, q.id)) ?? "";
    case "scale": {
      const raw = textValue(answers, q.id);
      return raw === "" ? "" : Number(raw);
    }
    case "text":
    case "textarea":
      return neutralizeFormula(textValue(answers, q.id));
    case "single":
      return textValue(answers, q.id);
  }
}

/** Fila de respuesta en el orden de `responseHeader()`. */
export function responseRow(
  meta: { submittedAt: string; token: string; empresa: string },
  answers: Answers,
): Cell[] {
  const row: Cell[] = [meta.submittedAt, QUESTIONNAIRE_VERSION, meta.token, neutralizeFormula(meta.empresa)];
  for (const q of allQuestions) {
    row.push(cellFor(q, answers));
    if (hasOther(q)) row.push(neutralizeFormula(textValue(answers, otherKey(q.id))));
  }
  return row;
}
