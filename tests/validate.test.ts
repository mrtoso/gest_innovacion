import assert from "node:assert/strict";
import { test } from "node:test";
import { allQuestions, hasOther, sections } from "../src/data/questionnaire";
import { neutralizeFormula, responseHeader, responseRow } from "../src/lib/columns";
import { sanitizeAnswers, validateAnswers, type Answers } from "../src/lib/validate";

/** Respuestas válidas mínimas: la primera opción de cada pregunta obligatoria visible. */
function complete(): Answers {
  const a: Answers = {};
  for (const q of allQuestions) {
    if (q.required === false) continue;
    if (q.type === "single") a[q.id] = q.options[0].label;
    else if (q.type === "multi") a[q.id] = [q.options[0].label];
    else if (q.type === "number") a[q.id] = "250";
    else if (q.type === "scale") a[q.id] = "3";
    else a[q.id] = "Texto";
  }
  return a;
}

test("los ids de pregunta son únicos", () => {
  const ids = allQuestions.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("valores corregidos del PDF (P3, P4, P10)", () => {
  const labels = (id: string) => {
    const q = allQuestions.find((x) => x.id === id);
    assert.ok(q && (q.type === "single" || q.type === "multi"));
    return q.options.map((o) => o.label);
  };
  assert.ok(labels("q03_ubicaciones").includes("Más de 500"));
  assert.ok(labels("q04_empleados_almacen").includes("Más de 10"));
  assert.ok(labels("q10_tiempo_localizar").includes("Más de 15 minutos"));
});

test("unas respuestas completas son válidas", () => {
  assert.deepEqual(validateAnswers(complete()), {});
});

test("falta una obligatoria → error", () => {
  const a = complete();
  delete a["n1_empleados_empresa"];
  assert.ok(validateAnswers(a)["n1_empleados_empresa"]);
});

test("P6 solo se exige si P5 no es 'No'", () => {
  const a = complete();
  a["q05_proceso_estandar"] = "No";
  delete a["q06_elementos_proceso"];
  assert.equal(validateAnswers(a)["q06_elementos_proceso"], undefined);
  a["q05_proceso_estandar"] = "Sí";
  assert.ok(validateAnswers(a)["q06_elementos_proceso"]);
});

test("opción excluyente no se combina con otras", () => {
  const a = complete();
  a["q08_problemas_almacenar"] = ["Ninguno", "Errores humanos en la anotación"];
  assert.ok(validateAnswers(a)["q08_problemas_almacenar"]);
});

test("'Otro' exige texto", () => {
  const a = complete();
  a["q01_tipo_productos"] = "Otro";
  assert.ok(validateAnswers(a)["q01_tipo_productos"]);
  a["q01_tipo_productos_otro"] = "Repuestos";
  assert.equal(validateAnswers(a)["q01_tipo_productos"], undefined);
});

test("opción inexistente y número inválido se rechazan", () => {
  const a = complete();
  a["n2_grupo_cadena"] = "Quizá";
  a["q02_metros2"] = "mucho";
  const errors = validateAnswers(a);
  assert.ok(errors["n2_grupo_cadena"]);
  assert.ok(errors["q02_metros2"]);
});

test("sanitize descarta claves desconocidas y respuestas de preguntas ocultas", () => {
  const a = complete();
  a["q05_proceso_estandar"] = "No";
  const clean = sanitizeAnswers({ ...a, hack: "x", __proto__: { y: 1 } });
  assert.equal("hack" in clean, false);
  assert.equal("q06_elementos_proceso" in clean, false);
});

test("sanitize ignora tipos incorrectos", () => {
  const clean = sanitizeAnswers({ n1_empleados_empresa: ["1–9"], q08_problemas_almacenar: "Ninguno" });
  assert.deepEqual(clean, {});
  assert.deepEqual(sanitizeAnswers(null), {});
});

test("la fila coincide con la cabecera y token está en la columna C", () => {
  const header = responseHeader();
  const row = responseRow({ submittedAt: "2026-01-01T00:00:00.000Z", token: "TOK", empresa: "ACME" }, complete());
  assert.equal(row.length, header.length);
  assert.equal(header[2], "token");
  assert.equal(row[2], "TOK");
  const extra = allQuestions.filter(hasOther).length;
  assert.equal(header.length, 4 + allQuestions.length + extra);
  assert.ok(sections.length > 0);
});

test("neutraliza fórmulas en texto libre", () => {
  assert.equal(neutralizeFormula("=SUMA(A1)"), "'=SUMA(A1)");
  assert.equal(neutralizeFormula("+34 600"), "'+34 600");
  assert.equal(neutralizeFormula("Texto normal"), "Texto normal");
});
