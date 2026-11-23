/** Carga `.env.local` si existe (Node ≥ 20.12). Si no existe, no hace nada. */
export function loadEnvLocal(): void {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // sin .env.local: se usan las variables del entorno
  }
}
