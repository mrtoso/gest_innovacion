/**
 * Crea `.env.local` a partir del JSON de la service account descargado de Google Cloud.
 *
 *   npm run env:from-json -- ruta/al/archivo.json ID_DE_LA_HOJA [--force]
 *
 * La clave privada solo se lee y se escribe en `.env.local` (ignorado por git, permisos 600).
 * No se imprime nunca. No sobrescribe un `.env.local` existente salvo con --force.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const force = args.includes("--force");
const [jsonPath, sheetId] = args.filter((a) => !a.startsWith("--"));

if (!jsonPath || !sheetId) {
  console.error("Uso: npm run env:from-json -- ruta/al/archivo.json ID_DE_LA_HOJA [--force]");
  process.exit(1);
}
if (!/^[A-Za-z0-9_-]{20,}$/.test(sheetId)) {
  console.error(
    "El ID de la hoja no parece válido. Es lo que hay entre /d/ y /edit en la URL de la hoja (no la URL completa).",
  );
  process.exit(1);
}

let key: { client_email?: string; private_key?: string; type?: string };
try {
  key = JSON.parse(readFileSync(jsonPath, "utf8"));
} catch {
  console.error(`No se puede leer ${jsonPath} como JSON.`);
  process.exit(1);
}
if (key.type !== "service_account" || !key.client_email || !key.private_key?.includes("PRIVATE KEY")) {
  console.error("El archivo no parece la clave JSON de una cuenta de servicio de Google Cloud.");
  process.exit(1);
}
if (existsSync(".env.local") && !force) {
  console.error("Ya existe .env.local. Usa --force para sobrescribirlo.");
  process.exit(1);
}

const lines = [
  `GOOGLE_SHEET_ID=${sheetId}`,
  `GOOGLE_SERVICE_ACCOUNT_EMAIL=${key.client_email}`,
  `GOOGLE_PRIVATE_KEY=${JSON.stringify(key.private_key)}`,
  "",
];
writeFileSync(".env.local", lines.join("\n"), { mode: 0o600 });

console.log(".env.local creado.");
console.log(`Comparte la hoja (permiso de Editor) con:  ${key.client_email}`);
console.log("Después ejecuta:  npm run check:setup");
