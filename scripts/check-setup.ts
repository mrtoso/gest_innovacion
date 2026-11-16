/**
 * Comprueba la conexión con Google Sheets y deja la hoja preparada.
 *
 *   npm run check:setup
 *
 * Lee las variables de `.env.local` (o del entorno) y:
 *   1. comprueba que existen GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_PRIVATE_KEY;
 *   2. se autentica y accede a la hoja;
 *   3. crea las pestañas `Empresas` y `Respuestas_v2` y sus cabeceras si faltan (idempotente);
 *   4. muestra cuántas empresas hay.
 * Nunca imprime la clave privada.
 */
import { sheetsStore } from "../src/lib/store/sheets";

const REQUIRED = ["GOOGLE_SHEET_ID", "GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY"] as const;

function hint(message: string): string {
  if (/\b404\b/.test(message)) {
    return "No se encuentra la hoja: revisa GOOGLE_SHEET_ID (es lo que hay entre /d/ y /edit en la URL).";
  }
  if (/\b403\b/.test(message)) {
    return "Sin permiso: comparte la hoja (Editor) con el email de la service account, y comprueba que la API de Google Sheets está activada en el proyecto de Google Cloud.";
  }
  if (/invalid_grant|DECODER|PEM|private key|asn1/i.test(message)) {
    return "La clave privada no es válida: copia el campo private_key del JSON completo (con -----BEGIN/END PRIVATE KEY-----).";
  }
  return "";
}

async function main() {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`Faltan variables: ${missing.join(", ")}`);
    console.error("Defínelas en .env.local (ver .env.example) y vuelve a ejecutar.");
    process.exit(1);
  }
  console.log(`Service account: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
  console.log("Conectando con Google Sheets…");

  await sheetsStore.ensureSetup();
  const companies = await sheetsStore.listCompanies();
  const answered = companies.filter((c) => c.respondidoEn).length;

  console.log("OK: la hoja es accesible y tiene las pestañas `Empresas` y `Respuestas_v2` con sus cabeceras.");
  console.log(`Empresas registradas: ${companies.length} (${answered} han respondido).`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERROR: ${message}`);
  const h = hint(message);
  if (h) console.error(h);
  process.exit(1);
});
