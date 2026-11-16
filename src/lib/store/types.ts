import type { Answers } from "../validate";

export type Company = {
  token: string;
  empresa: string;
  email: string;
  enviadoEn: string;
  respondidoEn: string;
};

export type NewCompany = { empresa: string; email: string };

export interface Store {
  /** Busca una empresa por token. null si no existe. */
  getCompany(token: string): Promise<Company | null>;

  /**
   * Guarda la respuesta si la empresa aún no ha respondido.
   * - "saved": guardada.
   * - "already": esa empresa ya había respondido (no se guarda nada).
   * - "unknown": el token no existe.
   */
  saveResponse(token: string, answers: Answers): Promise<"saved" | "already" | "unknown">;

  // --- Preparación de envíos (scripts) ---
  /** Crea la estructura necesaria (cabeceras, pestañas…). Idempotente. */
  ensureSetup(): Promise<void>;
  listCompanies(): Promise<Company[]>;
  addCompanies(companies: Company[]): Promise<void>;
}
