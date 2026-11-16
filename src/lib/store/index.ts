import { devStore } from "./dev";
import { sheetsStore } from "./sheets";
import type { Store } from "./types";

export type { Company, NewCompany, Store } from "./types";

function sheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY,
  );
}

/** Google Sheets si hay credenciales; fichero local solo fuera de producción. */
export function getStore(): Store {
  if (sheetsConfigured()) return sheetsStore;
  if (process.env.NODE_ENV !== "production") return devStore;
  throw new Error(
    "Almacenamiento sin configurar: define GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_PRIVATE_KEY.",
  );
}

/** Los tokens que generamos son base64url de 22 caracteres; se aceptan hasta 64. */
export function isValidTokenFormat(token: string): boolean {
  return /^[A-Za-z0-9_-]{16,64}$/.test(token);
}
