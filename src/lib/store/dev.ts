import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { responseHeader, responseRow } from "../columns";
import type { Answers } from "../validate";
import type { Company, Store } from "./types";

/**
 * Almacén local en un fichero JSON, SOLO para desarrollo y pruebas (sin credenciales de Google).
 * Las lecturas/escrituras son síncronas, así que comprobar-y-guardar es atómico en un proceso.
 */
type DevData = {
  companies: Company[];
  header: string[];
  responses: (string | number)[][];
};

// El almacén local solo se usa en desarrollo: se excluye del rastreo de ficheros del build.
const FILE = process.env.DEV_STORE_FILE ?? join(process.cwd(), ".data", "dev-store.json");

function load(): DevData {
  if (!existsSync(/*turbopackIgnore: true*/ FILE)) return { companies: [], header: responseHeader(), responses: [] };
  return JSON.parse(readFileSync(/*turbopackIgnore: true*/ FILE, "utf8")) as DevData;
}

function save(data: DevData): void {
  mkdirSync(/*turbopackIgnore: true*/ dirname(FILE), { recursive: true });
  writeFileSync(/*turbopackIgnore: true*/ FILE, JSON.stringify(data, null, 2));
}

export const devStore: Store = {
  async getCompany(token) {
    return load().companies.find((c) => c.token === token) ?? null;
  },

  async saveResponse(token, answers: Answers) {
    const data = load();
    const company = data.companies.find((c) => c.token === token);
    if (!company) return "unknown";
    const alreadyInResponses = data.responses.some((row) => row[2] === token);
    if (company.respondidoEn || alreadyInResponses) return "already";

    const submittedAt = new Date().toISOString();
    data.responses.push(responseRow({ submittedAt, token, empresa: company.empresa }, answers));
    company.respondidoEn = submittedAt;
    save(data);
    return "saved";
  },

  async ensureSetup() {
    const data = load();
    data.header = responseHeader();
    save(data);
  },

  async listCompanies() {
    return load().companies;
  },

  async addCompanies(companies) {
    const data = load();
    data.companies.push(...companies);
    save(data);
  },
};
