/**
 * Genera un enlace único por empresa.
 *
 *   npm run links -- empresas.csv [enlaces.csv]
 *
 * Entrada:  CSV con cabecera `empresa,email`.
 * Salida:   CSV `empresa,email,enlace` (para preparar los emails).
 * Efecto:   añade las empresas nuevas a la pestaña `Empresas` (Google Sheets, o el
 *           almacén local de desarrollo si no hay credenciales).
 *
 * Es idempotente: una empresa que ya existe (mismo nombre, sin distinguir mayúsculas)
 * conserva su enlace; nunca se le genera un segundo token.
 *
 * Variables: APP_URL (por defecto http://localhost:3000) y las de Google (ver .env.example).
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { getStore } from "../src/lib/store/index";
import type { Company } from "../src/lib/store/types";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === "," || c === ";") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

function csvCell(value: string): string {
  return /[",\n\r;]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

async function main() {
  const [input, output = "enlaces.csv"] = process.argv.slice(2);
  if (!input) {
    console.error("Uso: npm run links -- empresas.csv [enlaces.csv]");
    process.exit(1);
  }
  const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

  const [header, ...rows] = parseCsv(readFileSync(input, "utf8").replace(/^﻿/, ""));
  const cols = header.map((h) => h.trim().toLowerCase());
  const iEmpresa = cols.indexOf("empresa");
  const iEmail = cols.indexOf("email");
  if (iEmpresa < 0 || iEmail < 0) {
    console.error("El CSV debe tener una cabecera con las columnas `empresa` y `email`.");
    process.exit(1);
  }

  const store = getStore();
  await store.ensureSetup();

  const existing = new Map((await store.listCompanies()).map((c) => [c.empresa.trim().toLowerCase(), c]));
  const created: Company[] = [];
  const result: { empresa: string; email: string; token: string }[] = [];

  for (const r of rows) {
    const empresa = (r[iEmpresa] ?? "").trim();
    const email = (r[iEmail] ?? "").trim();
    if (!empresa) continue;
    const key = empresa.toLowerCase();
    let company = existing.get(key);
    if (!company) {
      company = {
        token: randomBytes(16).toString("base64url"), // 128 bits → 22 caracteres
        empresa,
        email,
        enviadoEn: "",
        respondidoEn: "",
      };
      existing.set(key, company);
      created.push(company);
    }
    result.push({ empresa, email, token: company.token });
  }

  await store.addCompanies(created);

  const lines = ["empresa,email,enlace"];
  for (const r of result) {
    lines.push([r.empresa, r.email, `${baseUrl}/f/${r.token}`].map(csvCell).join(","));
  }
  writeFileSync(output, lines.join("\n") + "\n");

  console.log(
    `${created.length} empresas nuevas, ${result.length - created.length} ya existían. Enlaces en ${output}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
