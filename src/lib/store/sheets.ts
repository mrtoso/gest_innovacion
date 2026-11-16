import { JWT } from "google-auth-library";
import { COMPANIES_TAB, RESPONSES_TAB, responseHeader, responseRow } from "../columns";
import type { Answers } from "../validate";
import type { Company, Store } from "./types";

/**
 * Almacén en Google Sheets, vía API REST con una service account.
 *
 * Variables de entorno:
 *   GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY
 * La hoja debe estar compartida (Editor) con el email de la service account.
 *
 * Pestañas:
 *   Empresas      token | empresa | email_contacto | enviado_en | respondido_en
 *   Respuestas_v2 (ver columns.ts; `token` es la columna C)
 */

const COMPANY_HEADER = ["token", "empresa", "email_contacto", "enviado_en", "respondido_en"];
const API = "https://sheets.googleapis.com/v4/spreadsheets";

let jwt: JWT | undefined;

function getJwt(): JWT {
  if (!jwt) {
    jwt = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      // En variables de entorno la clave suele llegar con "\n" literales.
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }
  return jwt;
}

function sheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("Falta GOOGLE_SHEET_ID");
  return id;
}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { token } = await getJwt().getAccessToken();
  const res = await fetch(`${API}/${sheetId()}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = ((await res.json()) as { error?: { message?: string } }).error?.message ?? "";
    } catch {
      // sin cuerpo JSON
    }
    throw new Error(`Google Sheets API ${res.status}: ${detail}`);
  }
  return (await res.json()) as T;
}

const enc = encodeURIComponent;

async function readRange(range: string): Promise<string[][]> {
  const data = await call<{ values?: string[][] }>(`/values/${enc(range)}`);
  return data.values ?? [];
}

async function writeRange(range: string, values: (string | number)[][]): Promise<void> {
  await call(`/values/${enc(range)}?valueInputOption=RAW`, { method: "PUT", body: { values } });
}

async function appendRows(tab: string, values: (string | number)[][]): Promise<void> {
  await call(`/values/${enc(`${tab}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: { values },
  });
}

function toCompany(row: string[]): Company {
  const [token = "", empresa = "", email = "", enviadoEn = "", respondidoEn = ""] = row;
  return { token, empresa, email, enviadoEn, respondidoEn };
}

/** Empresas con su número de fila en la hoja (la fila 1 es la cabecera). */
async function readCompanies(): Promise<{ company: Company; row: number }[]> {
  const rows = await readRange(`${COMPANIES_TAB}!A2:E`);
  return rows
    .map((r, i) => ({ company: toCompany(r), row: i + 2 }))
    .filter(({ company }) => company.token !== "");
}

export const sheetsStore: Store = {
  async getCompany(token) {
    const found = (await readCompanies()).find(({ company }) => company.token === token);
    return found?.company ?? null;
  },

  async saveResponse(token, answers: Answers) {
    const found = (await readCompanies()).find(({ company }) => company.token === token);
    if (!found) return "unknown";
    if (found.company.respondidoEn) return "already";

    // Fuente de verdad secundaria: el token en la hoja de respuestas (columna C).
    const tokens = await readRange(`${RESPONSES_TAB}!C2:C`);
    if (tokens.some((r) => r[0] === token)) return "already";

    const submittedAt = new Date().toISOString();
    await appendRows(RESPONSES_TAB, [
      responseRow({ submittedAt, token, empresa: found.company.empresa }, answers),
    ]);

    try {
      await writeRange(`${COMPANIES_TAB}!E${found.row}`, [[submittedAt]]);
    } catch (error) {
      // La respuesta ya está guardada; se podrá reconciliar por el token en la hoja de respuestas.
      console.error("No se pudo marcar respondido_en", error instanceof Error ? error.message : error);
    }
    return "saved";
  },

  async ensureSetup() {
    const meta = await call<{ sheets: { properties: { title: string } }[] }>(
      "?fields=sheets.properties.title",
    );
    const existing = new Set(meta.sheets.map((s) => s.properties.title));
    const missing = [COMPANIES_TAB, RESPONSES_TAB].filter((t) => !existing.has(t));
    if (missing.length > 0) {
      await call(":batchUpdate", {
        method: "POST",
        body: { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) },
      });
    }
    if ((await readRange(`${COMPANIES_TAB}!A1:A1`)).length === 0) {
      await writeRange(`${COMPANIES_TAB}!A1`, [COMPANY_HEADER]);
    }
    if ((await readRange(`${RESPONSES_TAB}!A1:A1`)).length === 0) {
      await writeRange(`${RESPONSES_TAB}!A1`, [responseHeader()]);
    }
  },

  async listCompanies() {
    return (await readCompanies()).map(({ company }) => company);
  },

  async addCompanies(companies) {
    if (companies.length === 0) return;
    await appendRows(
      COMPANIES_TAB,
      companies.map((c) => [c.token, c.empresa, c.email, c.enviadoEn, c.respondidoEn]),
    );
  },
};
