# gest_innovacion

Pequeña web, alojada en Vercel, para que pymes rellenen el **Cuestionario Gestión Almacén v2** (origen: `CuestionarioAlmacenes-v2.pdf`). Las respuestas se guardan en una **hoja de cálculo** y se exportan a **CSV** para analizarlas después (estudio de necesidades sobre localización y control de mercancía en almacenes pequeños).

## Contexto de uso

- Se contacta a las pymes por **email** pidiéndoles una **llamada** (vía principal; en la llamada se rellena el cuestionario como entrevista, fuera de esta web).
- Como **segunda opción, más independiente**, el email ofrece un **enlace a esta web** para que la pyme lo rellene **sola**, sin entrevistador.
- **Requisito clave: saber qué empresa ha rellenado qué formulario, y que cada empresa responda una sola vez.** Por eso cada pyme recibe un **enlace único** con un token (ver "Enlaces únicos y una respuesta por empresa"). No hay formulario abierto.
- Consecuencia: los textos de la web deben entenderse sin que nadie los explique. Dirigirse a la empresa en segunda persona ("su empresa", "su almacén") y añadir ayudas breves donde una pregunta pueda confundir (p. ej. "ubicaciones = huecos para paquetes").

## Estado del proyecto

**Primera versión funcional construida** (formulario por pasos, enlaces únicos, guardado en Google Sheets, script de enlaces, tests unitarios y comprobación E2E en navegador con almacén local). **Aún no probado contra una hoja de Google real ni desplegado en Vercel**: falta crear la hoja, la service account y las variables de entorno (ver `README.md` y `.env.example`). Si cambia una decisión, actualiza este archivo.

## Idioma

- Interfaz, textos del cuestionario, mensajes de error y comentarios de cara al usuario: **español (es-ES)**.
- Código (identificadores, nombres de ficheros, commits): inglés o español, pero consistente. Propuesta: identificadores en inglés, textos visibles en español.

## Público y requisitos de uso

- Quien rellena es personal de pymes (propietarios, responsables de almacén, empleados), a menudo desde el móvil y sin perfil técnico. **Mobile-first**, lenguaje claro, sin registro ni login.
- El formulario es largo (~45 preguntas): debe poder completarse por secciones, mostrar progreso y no perder respuestas si se recarga la página (guardar borrador en `localStorage`).
- Accesible (WCAG 2.1 AA como mínimo): etiquetas asociadas, foco visible, navegación por teclado, contraste suficiente.
- Hay datos personales (nombre y rol de la persona) y datos de empresa. Hace falta **aviso de privacidad y consentimiento (RGPD)** antes de enviar. No registrar datos personales en logs.

## Stack

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4**, desplegado en Vercel. Esta versión tiene `cacheComponents` y `partialPrefetching` activados: **lee `node_modules/next/dist/docs/` antes de tocar APIs de Next** (ver `AGENTS.md`). Consecuencia práctica: todo lo que dependa de la petición (`params`, lecturas a la hoja) va dentro de `<Suspense>` (ver `src/app/f/[token]/page.tsx`).
- Validación **propia** y compartida cliente/servidor en `src/lib/validate.ts` (maneja visibilidad condicional y opciones "Otro"/excluyentes); no se usan zod ni react-hook-form.
- Envío: Route Handler `POST /api/submit`, que valida token, consentimiento y respuestas en servidor y guarda.
- Almacenamiento: **Google Sheets** vía API REST con una *service account* (`google-auth-library` + `fetch`; no `googleapis`, por tamaño). Una fila por envío (`values:append`). Variables de entorno de Vercel: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`; la hoja se comparte (Editor) con el email de la service account. **Nunca** commitear credenciales ni la clave privada.
- Sin credenciales y fuera de producción se usa un **almacén local** (`.data/dev-store.json`, ignorado por git) con la misma interfaz (`src/lib/store/`). En producción sin credenciales la app falla a propósito.
- Exportación: CSV. No se programa nada: se descarga desde Google Sheets (Archivo → Descargar → CSV). El formato de las columnas debe pensarse para que ese CSV sea directamente analizable.

### Enlaces únicos y una respuesta por empresa

El libro de Google Sheets tiene (al menos) dos pestañas:

- **`Empresas`** (la rellena el equipo antes de enviar los emails): una fila por pyme con `token`, `empresa`, `email_contacto`, `enviado_en`, `respondido_en` (vacío hasta que conteste). Es la lista de destinatarios y el control de quién ha respondido.
- **`Respuestas_v2`**: una fila por envío (ver formato abajo), con el `token` y la `empresa` de quien respondió.

Reglas:

- El enlace es `https://<dominio>/f/<token>`. El token es **aleatorio e inadivinable** (≥ 128 bits, p. ej. 22 caracteres base64url generados con `crypto.randomBytes(16)`), nunca secuencial ni derivado del nombre de la empresa.
- El **script** `npm run links -- empresas.csv [enlaces.csv]` (`scripts/generate-links.ts`) lee un CSV `empresa,email`, genera los tokens, rellena la pestaña `Empresas` (y crea pestañas y cabeceras si faltan) y produce un CSV `empresa,email,enlace`. Es **idempotente**: una empresa que ya existe (mismo nombre, sin distinguir mayúsculas) conserva su token. No generar tokens a mano. Usa `APP_URL` para construir los enlaces. `empresas*.csv` y `enlaces*.csv` están en `.gitignore` (contienen datos de empresas y tokens).
- **Al abrir el enlace**: el servidor busca el token en `Empresas`.
  - Token inexistente → pantalla "Enlace no válido, contacte con nosotros" (sin revelar nada más).
  - Token ya usado (`respondido_en` relleno) → pantalla "Ya hemos recibido su respuesta, gracias". No mostrar el formulario ni las respuestas anteriores.
  - Token válido → mostrar el formulario con `Empresa` **precargada desde la hoja** (la identidad de la empresa viene del token, no de lo que teclee el usuario).
- **Al enviar**: validar el token **en servidor**, volver a comprobar que no se ha usado, añadir la fila a `Respuestas_v2` y marcar `respondido_en`. Si falla el segundo paso, no dejar la respuesta huérfana: registrar el error y poder reconciliar a mano (el `token` en `Respuestas_v2` es la fuente de verdad).
- **Concurrencia**: Sheets no tiene transacciones; un doble clic o dos pestañas pueden colarse. Mitigar deshabilitando el botón tras enviar y comprobando de nuevo en servidor justo antes de escribir; si aun así hay duplicados, **la primera fila por `token` es la válida** (el export a CSV debe poder deduplicarse por `token`).
- Los tokens son secretos de acceso: no loguearlos, no ponerlos en analítica ni en `Referer` hacia terceros (`Referrer-Policy: no-referrer`) y no indexar la página (`noindex`).
- El borrador en `localStorage` se guarda **por token**.

### Formato de la hoja `Respuestas_v2` (una fila por envío)

- Una **columna por pregunta**, en el orden del cuestionario; la cabecera se genera desde `questionnaire.ts` (no a mano) y usa el `id` estable de cada pregunta.
- Columnas iniciales fijas: `submitted_at` (ISO 8601, UTC), `questionnaire_version` (`v2`), `token`, `empresa` (la de la pestaña `Empresas`, para poder identificar la fila sin cruzar hojas).
- Selección única: el texto literal de la opción elegida. Multi-selección: opciones separadas por ` | ` en una sola celda. Campos "Otro": columna adicional `<id>_otro`. Escala y numéricos: número.
- Texto libre que empiece por `=`, `+`, `-` o `@` debe neutralizarse (prefijo `'`) para evitar inyección de fórmulas en Sheets/Excel al abrir el CSV.
- Si cambia el cuestionario (nueva versión), **no reutilizar la misma pestaña**: crear una pestaña nueva por versión o añadir columnas al final, nunca reordenar las existentes.

## Estructura

```
src/
  app/
    page.tsx                 # portada ("use el enlace personal")
    f/[token]/page.tsx       # puerta: token inválido / ya respondido / formulario
    api/submit/route.ts      # POST: valida y guarda
    privacidad/page.tsx      # BORRADOR con campos "[pendiente de completar]"
  components/
    Questionnaire.tsx        # flujo por pasos, autoguardado, envío
    QuestionField.tsx        # un campo por tipo de pregunta
    Messages.tsx, Card.tsx   # pantallas de estado y contenedores
  data/questionnaire.ts      # ÚNICA fuente de verdad del cuestionario
  lib/
    validate.ts              # validación/sanitización/visibilidad (cliente + servidor)
    columns.ts               # cabecera y fila de la hoja; neutralización de fórmulas
    store/                   # interfaz + implementación Sheets + almacén local
  config.ts                  # nombre del estudio, contacto (env NEXT_PUBLIC_*)
scripts/generate-links.ts    # genera enlaces únicos
tests/validate.test.ts       # tests unitarios (node:test)
```

## El cuestionario: reglas de modelado

El cuestionario se define **como datos** en `src/data/questionnaire.ts` (secciones → preguntas → opciones). La UI, la validación y la cabecera de la hoja se generan a partir de ahí. No hardcodear preguntas en componentes.

Cada pregunta tiene: `id` estable, `pdfRef`, texto, tipo (`single` | `multi` | `text` | `textarea` | `number` | `scale`), opciones (con `exclusive` / `other`), `required` (por defecto `true`) y `showIf` si es condicional.

### Estructura (PDF v2)

- **Datos generales**: Empresa (precargada desde el token, no es una pregunta), Persona (nombre y cargo; en el PDF "Persona entrevistada (nombre y rol)"), Fecha (automática: `submitted_at`), Breve descripción de la actividad (texto libre, opcional); N1 nº de empleados, N2 grupo/cadena/franquicia, N3 puesto de la persona.
- **Sección 1. Información básica del almacén**: 1–4, N4, N5.
- **Sección 2. Problemas en la colocación de mercancía**: 5–8, N6–N11.
- **Sección 3. Problemas en la recogida y acceso a los paquetes**: 9–14, N13, N14, N16–N19.
- **Sección 3.1. Inventario y control de stock**: N20–N24.
- **Sección 4. Sistemas de seguimiento actuales**: 15, 16, N25–N29, 17, 18.

### Gotchas del PDF (importante)

- **Numeración mezclada.** Las preguntas sin prefijo (1–18) son las originales; las prefijadas con `N` (N1–N29) son las añadidas en la v2. Faltan N12 y N15 (no existen en el PDF). El orden de aparición manda, no el número. **Usar `id` estables propios** (p. ej. `s2_q05_proceso_estandar`), no derivarlos del número visible, y mantener una referencia al número del PDF (`pdfRef: "N10"`) para poder cruzar con el documento.
- **Posible numeración duplicada**: hay una N13 (tiempo en encontrar el último producto que no aparecía) y una 13 (razón principal de que un producto no esté en su sitio). Son preguntas distintas.
- **Opciones corruptas en el PDF** (símbolo `❶` en lugar de texto). **Confirmadas por el autor** — usar estos valores y no los del PDF:
  - P3 (ubicaciones): última opción = "Más de 500".
  - P4 (empleados en almacén): última opción = "Más de 10".
  - P10 (tiempo en localizar un paquete): última opción = "Más de 15 minutos".
- **Lógica condicional implícita**:
  - P6 ("Si lo tiene, ¿cuáles…?") solo aplica si P5 ≠ "No".
  - Las preguntas "Otro: ____" / "Otros: ____" / "e) Otra (descríbala)" llevan un campo de texto asociado que se muestra y se exige solo al marcar esa opción.
  - Las opciones excluyentes ("Ninguno", "Nada formal", "Ninguna", "No ocurre nunca") en preguntas multi-selección deben desmarcar el resto y viceversa.
  - Las descripciones "(Opcional: describa un caso reciente)" tras P7 y P11 son campos de texto opcionales.
- **Tipos especiales**: P2 es numérico (m²); N25 es escala 1–5 (1 = nada satisfecho, 5 = muy satisfecho).
- **Multi-selección** ("marque/seleccione todas las que apliquen"): P6, P8, P12, P14, N26. El resto son selección única. **Dudosas** (el PDF no lo indica; hoy son selección única, marcadas `TODO(confirmar)` en `questionnaire.ts`): P1, P9, N16.
- Los textos de las opciones se copian **literalmente** del PDF (incluidas tildes y rangos con guion largo). Únicas diferencias deliberadas: se quitan los marcadores "a)…f)" de P13 y los puntos finales, y se usa "Su nombre y cargo" para la persona que rellena.
- Mejora de usabilidad respecto al PDF: "Describa un caso reciente" (tras P7 y P11) solo se muestra si la frecuencia no es "Nunca".
- **Obligatoriedad**: todas las preguntas de elección/número son obligatorias salvo los textos libres opcionales; el usuario no avanza de paso con preguntas sin responder. Si baja la tasa de finalización, plantear relajarlo (`required: false` por pregunta en `questionnaire.ts`).

## Convenciones

- TypeScript estricto; sin `any` salvo justificación.
- Un cambio de pregunta u opción = cambio en `questionnaire.ts` y nada más; el esquema y la UI deben seguirlo solos.
- Las respuestas guardadas deben incluir la **versión del cuestionario** (`"v2"`) y marca de tiempo, para poder comparar versiones futuras.
- Validar siempre en servidor aunque ya se valide en cliente.
- El endpoint de envío solo acepta tokens existentes y no usados (eso ya limita el spam), limita el tamaño del cuerpo (100 kB) y de cada texto libre, y nunca registra tokens ni respuestas en logs.
- Antes de dar algo por hecho: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`. Para cambios de UI, probar en el navegador (móvil y escritorio) con el almacén local.
- Commits pequeños y descriptivos. No crear PRs salvo que se pida.

## Comandos

```bash
npm install
npm run dev                                   # http://localhost:3000 (almacén local si no hay credenciales)
npm run build && npm start
npm run lint && npm run typecheck
npm test                                      # tests unitarios (node:test + tsx)
npm run links -- empresas.csv enlaces.csv     # genera enlaces únicos (APP_URL=https://… para producción)
```

`next typegen` genera los tipos de rutas (`LayoutProps`, etc.); `npm run build` también los genera.

## Decisiones abiertas

Resueltas:
- Respuestas → Google Sheets. Resultados → exportación manual a CSV (sin panel de administración). Lo rellena la pyme **sola**.
- Identificación de la empresa → **enlace único por pyme con token**; **una sola respuesta por empresa**.
- Valores corruptos del PDF (P3, P4, P10) → confirmados (ver gotchas).
- Diseño: estilo académico/universitario sobrio (azul marino, titulares con serifa, acento dorado) y muy sencillo de rellenar (un paso por sección, controles grandes, autoguardado). **Sin logos ni marcas de ninguna universidad**: si se quiere usar un escudo/logo oficial (p. ej. de la UPM) hace falta autorización de la institución y sustituir el cuadro "GA" de `src/app/layout.tsx`.

Pendientes:
1. **¿P1, P9 y N16 admiten varias respuestas?** Hoy son selección única.
2. **Textos legales**: aviso de privacidad (`src/app/privacidad/page.tsx` es un borrador marcado "pendiente de completar"), responsable del tratamiento, plazo de conservación, a quién escribir para ejercer derechos RGPD. Variables `NEXT_PUBLIC_ORG_NAME` y `NEXT_PUBLIC_CONTACT_EMAIL`.
3. **Pantalla tras enviar**: hoy solo agradecimiento. ¿Invitar a dejar un teléfono para la llamada?
4. **Despliegue**: crear la hoja de Google y la service account, configurar variables en Vercel, dominio. Probar un envío real contra la hoja antes de mandar emails (la integración con Sheets solo está probada con el almacén local).
5. **Registrar `enviado_en`**: la columna existe en `Empresas` pero nada la rellena todavía (se puede rellenar a mano al mandar los emails, o ampliar el script).
6. **Longitud (~44 preguntas, ~15 min)**: valorar una versión corta como camino principal para mejorar la tasa de respuesta.
