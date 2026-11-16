# Despliegue: hoja de Google + Vercel

Guía para dejar la web funcionando. Tiempo estimado: 30–45 minutos. Hacen falta tus cuentas de
Google y de Vercel (no se pueden crear desde el repositorio).

> **Nunca** pegues la clave privada en un chat, en un issue ni en un commit. Solo va en
> `.env.local` (que git ignora) y en las variables de entorno de Vercel.

## 1. Hoja de Google

1. Crea una hoja nueva en <https://sheets.google.com> (por ejemplo, "Cuestionario almacenes").
   **Déjala vacía**: el script crea las pestañas y las cabeceras.
2. Copia el **ID de la hoja**: en la URL, lo que hay entre `/d/` y `/edit`.
   `https://docs.google.com/spreadsheets/d/`**`ESTE_ES_EL_ID`**`/edit`

## 2. Cuenta de servicio de Google Cloud

La web escribe en la hoja con una "cuenta de servicio" (un usuario robot).

1. Entra en <https://console.cloud.google.com/> y crea un proyecto (p. ej. `gest-innovacion`).
2. **APIs y servicios → Biblioteca →** busca **Google Sheets API → Habilitar**.
3. **IAM y administración → Cuentas de servicio → Crear cuenta de servicio**. Ponle un nombre
   (p. ej. `formulario-web`); no hace falta asignarle roles.
4. Abre la cuenta creada → pestaña **Claves → Agregar clave → Crear clave nueva → JSON**.
   Se descarga un archivo `.json`.
5. **Comparte la hoja** (botón *Compartir*) con el email de la cuenta de servicio
   (`…@…iam.gserviceaccount.com`, está en el JSON como `client_email`) con permiso de **Editor**.

> Si la creación de claves está bloqueada ("la política de la organización impide crear claves"),
> es habitual en cuentas de Workspace/universidad: usa un proyecto de una cuenta de Google personal
> o pide a tu administrador que lo permita.

## 3. Probar en local

1. Crea `.env.local` copiando `.env.example` y rellena con el JSON descargado:

   ```bash
   GOOGLE_SHEET_ID=el_id_de_la_hoja
   GOOGLE_SERVICE_ACCOUNT_EMAIL=el_client_email_del_json
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n"
   ```

   Copia `private_key` tal cual aparece en el JSON (con los `\n`) y entre comillas dobles.
2. Comprueba la conexión y prepara la hoja:

   ```bash
   npm run check:setup
   ```

   Debe decir `OK` y crear las pestañas `Empresas` y `Respuestas_v2` con sus cabeceras. Si falla,
   el mensaje indica la causa probable (hoja no compartida, API sin habilitar, clave mal copiada…).
3. Borra el archivo `.json` descargado cuando ya no lo necesites.

## 4. Vercel

1. Entra en <https://vercel.com/> (puedes usar "Continuar con GitHub").
2. **Add New → Project →** importa el repositorio `mrtoso/gest_innovacion`. Vercel detecta
   Next.js; deja la configuración por defecto.
3. Antes de desplegar, en **Environment Variables** añade (entorno *Production*):

   | Variable | Valor |
   | --- | --- |
   | `GOOGLE_SHEET_ID` | el ID de la hoja |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | el `client_email` del JSON |
   | `GOOGLE_PRIVATE_KEY` | el `private_key` del JSON (con saltos de línea o con `\n`) |
   | `NEXT_PUBLIC_ORG_NAME` | nombre de la institución (se ve en la cabecera y en privacidad) |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | email de contacto (también para derechos RGPD) |

   Las variables `NEXT_PUBLIC_*` se incorporan al compilar: si las cambias, hay que **redesplegar**.
4. Pulsa **Deploy**. Al terminar tendrás una URL tipo `https://gest-innovacion.vercel.app`.
5. (Opcional) **Settings → Domains** para usar un dominio propio.

Notas:
- El plan gratuito (*Hobby*) de Vercel es para uso **no comercial**; revisa sus condiciones si el
  proyecto forma parte de una actividad comercial.
- Los *Preview deployments* (ramas/PR) no tienen credenciales si solo configuraste *Production*, y
  mostrarán un error al abrir un enlace. Es lo deseado: así las pruebas no escriben en la hoja real.

## 5. Prueba real antes de mandar emails

1. Con `.env.local` apuntando a la hoja, crea una empresa de prueba y su enlace usando **la URL
   de producción**:

   ```bash
   printf 'empresa,email\nPRUEBA - borrar,prueba@example.com\n' > empresas-prueba.csv
   APP_URL=https://TU-URL.vercel.app npm run links -- empresas-prueba.csv enlaces-prueba.csv
   ```

2. Abre el enlace de `enlaces-prueba.csv` en el móvil, rellena el cuestionario y envía.
3. Comprueba en la hoja: aparece una fila en `Respuestas_v2` (con el nombre "PRUEBA - borrar") y
   `respondido_en` se rellena en `Empresas`. Vuelve a abrir el enlace: debe decir que ya se
   respondió.
4. **Borra las filas de prueba** de las dos pestañas (la de `Empresas` y la de `Respuestas_v2`).
5. Revisa `/privacidad` en producción: no debe quedar ningún "pendiente de completar" (necesita
   `NEXT_PUBLIC_ORG_NAME`, `NEXT_PUBLIC_CONTACT_EMAIL` y el texto legal revisado).

## 6. Envío real

1. Prepara `empresas.csv` (`empresa,email`) y genera los enlaces:

   ```bash
   APP_URL=https://TU-URL.vercel.app npm run links -- empresas.csv enlaces.csv
   ```

2. Usa `enlaces.csv` para preparar los emails (un enlace por empresa). `enlaces.csv` contiene
   los enlaces personales: trátalo como confidencial (git lo ignora).
3. Anota en la columna `enviado_en` de la pestaña `Empresas` cuándo mandaste cada email (a mano).
   Las empresas con `respondido_en` vacío son las que faltan por contestar: sirve para los
   recordatorios.

## 7. Resultados

- En Google Sheets: **Archivo → Descargar → Valores separados por comas (.csv)** con la pestaña
  `Respuestas_v2` activa.
- Si alguna empresa aparece duplicada (muy improbable), vale la **primera fila** por `token`.
- Las respuestas múltiples van en una celda separadas por ` | `; las opciones "Otro" tienen su
  propia columna `<pregunta>_otro`.

## Seguridad y mantenimiento

- **Rotar la clave** si se filtra: en Google Cloud, Claves → eliminar la antigua y crear otra;
  actualiza `GOOGLE_PRIVATE_KEY` en Vercel y redesplega.
- Quien tenga el enlace de una empresa puede rellenar su cuestionario: reenvíalo solo a esa empresa.
- No edites ni reordenes las columnas de `Respuestas_v2` a mano: la web escribe por posición.
- Si cambia el cuestionario (v3), crea una pestaña nueva en lugar de reutilizar `Respuestas_v2`.
