# gest_innovacion

Web (Next.js, desplegable en Vercel) para que pymes rellenen el **Cuestionario Gestión Almacén v2**.
Cada empresa recibe un enlace único; las respuestas se guardan en Google Sheets y se exportan a CSV.

Contexto, decisiones y reglas del proyecto: ver [`CLAUDE.md`](./CLAUDE.md).

## Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:3000
```

Sin credenciales de Google, en desarrollo se usa un almacén local (`.data/dev-store.json`).

## Preparar los envíos

1. Crea un CSV con cabecera `empresa,email` (p. ej. `empresas.csv`).
2. Genera los enlaces únicos:

   ```bash
   APP_URL=https://tu-dominio.vercel.app npm run links -- empresas.csv enlaces.csv
   ```

3. `enlaces.csv` contiene `empresa,email,enlace` para preparar los emails.

## Configuración (Vercel / `.env.local`)

Ver `.env.example`. En producción hacen falta `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` y
`GOOGLE_PRIVATE_KEY`; la hoja debe estar compartida (Editor) con la service account.

## Scripts

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run links`
