# gest_innovacion

Pequeña web, alojada en Vercel, para que pymes rellenen el **Cuestionario Gestión Almacén v2** (origen: `CuestionarioAlmacenes-v2.pdf`). Las respuestas se guardan en una **hoja de cálculo** y se exportan a **CSV** para analizarlas después (estudio de necesidades sobre localización y control de mercancía en almacenes pequeños).

## Contexto de uso

- Se contacta a las pymes por **email** pidiéndoles una **llamada** (vía principal; en la llamada se rellena el cuestionario como entrevista, fuera de esta web).
- Como **segunda opción, más independiente**, el email ofrece un **enlace a esta web** para que la pyme lo rellene **sola**, sin entrevistador.
- **Requisito clave: saber qué empresa ha rellenado qué formulario, y que cada empresa responda una sola vez.** Por eso cada pyme recibe un **enlace único** con un token (ver "Enlaces únicos y una respuesta por empresa"). No hay formulario abierto.
- Consecuencia: los textos de la web deben entenderse sin que nadie los explique. Dirigirse a la empresa en segunda persona ("su empresa", "su almacén") y añadir ayudas breves donde una pregunta pueda confundir (p. ej. "ubicaciones = huecos para paquetes").

## Estado del proyecto

Repositorio recién creado y vacío: no hay código todavía. Lo que sigue en "Stack" y "Estructura" es la **propuesta inicial**, no algo ya construido. Si cambia una decisión, actualiza este archivo.

## Idioma

- Interfaz, textos del cuestionario, mensajes de error y comentarios de cara al usuario: **español (es-ES)**.
- Código (identificadores, nombres de ficheros, commits): inglés o español, pero consistente. Propuesta: identificadores en inglés, textos visibles en español.

## Público y requisitos de uso

- Quien rellena es personal de pymes (propietarios, responsables de almacén, empleados), a menudo desde el móvil y sin perfil técnico. **Mobile-first**, lenguaje claro, sin registro ni login.
- El formulario es largo (~45 preguntas): debe poder completarse por secciones, mostrar progreso y no perder respuestas si se recarga la página (guardar borrador en `localStorage`).
- Accesible (WCAG 2.1 AA como mínimo): etiquetas asociadas, foco visible, navegación por teclado, contraste suficiente.
- Hay datos personales (nombre y rol de la persona) y datos de empresa. Hace falta **aviso de privacidad y consentimiento (RGPD)** antes de enviar. No registrar datos personales en logs.

## Stack propuesto

- **Next.js (App Router) + TypeScript**, desplegado en Vercel.
- Validación con **zod** (el mismo esquema en cliente y servidor).
- Formulario con **react-hook-form**.
- Estilos: Tailwind CSS.
- Envío: Route Handler / Server Action de Next.js que valida y guarda.
- Almacenamiento de respuestas: **Google Sheets** (decidido). Propuesta: API de Google Sheets con una *service account* (paquete `googleapis`), añadiendo una fila por envío (`spreadsheets.values.append`). Credenciales y ID de la hoja en variables de entorno de Vercel (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`); la hoja se comparte con el email de la service account. **Nunca** commitear credenciales ni la clave privada.
- Exportación: CSV. No se programa nada: se descarga desde Google Sheets (Archivo → Descargar → CSV). El formato de las columnas debe pensarse para que ese CSV sea directamente analizable.

### Enlaces únicos y una respuesta por empresa

El libro de Google Sheets tiene (al menos) dos pestañas:

- **`Empresas`** (la rellena el equipo antes de enviar los emails): una fila por pyme con `token`, `empresa`, `email_contacto`, `enviado_en`, `respondido_en` (vacío hasta que conteste). Es la lista de destinatarios y el control de quién ha respondido.
- **`Respuestas_v2`**: una fila por envío (ver formato abajo), con el `token` y la `empresa` de quien respondió.

Reglas:

- El enlace es `https://<dominio>/f/<token>` (o `/?t=<token>`). El token es **aleatorio e inadivinable** (≥ 128 bits, p. ej. 22 caracteres base64url generados con `crypto.randomBytes(16)`), nunca secuencial ni derivado del nombre de la empresa.
- Hay que tener un **script** (`scripts/generate-links`) que, dada una lista de empresas, genere los tokens, rellene la pestaña `Empresas` y produzca un CSV `empresa, email, enlace` para preparar el envío de emails. No generar tokens a mano.
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

## Estructura prevista

```
src/
  app/                  # rutas (formulario, página de gracias, privacidad)
  components/           # componentes de formulario reutilizables
  data/questionnaire.ts # ÚNICA fuente de verdad del cuestionario
  lib/                  # esquema zod derivado, almacenamiento, utilidades
```

## El cuestionario: reglas de modelado

El cuestionario se define **como datos** en `src/data/questionnaire.ts` (secciones → preguntas → opciones). La UI y el esquema de validación se generan a partir de ahí. No hardcodear preguntas en componentes.

Cada pregunta tiene: `id` estable, texto, tipo (`single` | `multi` | `text` | `textarea` | `number` | `scale`), opciones, si es obligatoria, y condiciones de visibilidad si las hay.

### Estructura (PDF v2)

- **Datos generales**: Empresa, Persona entrevistada (nombre y rol), Fecha, Breve descripción de la actividad (texto libre); N1 nº de empleados, N2 grupo/cadena/franquicia, N3 puesto de la persona.
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
- **Multi-selección** ("marque/seleccione todas las que apliquen"): P6, P8, P12, P14, N26 (y P9 según lectura; el PDF no lo indica explícitamente, confirmar). El resto son selección única.
- Los textos de las opciones se copian **literalmente** del PDF (incluidas tildes y rangos con guion largo), salvo corrección explícita acordada.

## Convenciones

- TypeScript estricto; sin `any` salvo justificación.
- Un cambio de pregunta u opción = cambio en `questionnaire.ts` y nada más; el esquema y la UI deben seguirlo solos.
- Las respuestas guardadas deben incluir la **versión del cuestionario** (`"v2"`) y marca de tiempo, para poder comparar versiones futuras.
- Validar siempre en servidor aunque ya se valide en cliente.
- Proteger el endpoint de envío contra spam (honeypot y/o límite de peticiones) y limitar el tamaño de los campos de texto libre.
- Commits pequeños y descriptivos. No crear PRs salvo que se pida.

## Comandos

Aún no existen (no hay `package.json`). Cuando se cree el proyecto, documentar aquí: instalar, `dev`, `build`, lint, tests.

## Decisiones abiertas

Resueltas:
- Respuestas → Google Sheets. Resultados → exportación manual a CSV (sin panel de administración). Lo rellena la pyme **sola**.
- Identificación de la empresa → **enlace único por pyme con token**; **una sola respuesta por empresa**.
- Valores corruptos del PDF (P3, P4, P10) → confirmados (ver gotchas).

Pendientes:
1. **¿P9 es multi-selección?** El PDF no lo indica. Mientras no se confirme, tratarla como selección única.
2. **Adaptación de las etiquetas de "Datos generales"** al uso autónomo: "Persona entrevistada (nombre y rol)" → p. ej. "Persona que rellena el formulario (nombre y cargo)"; el campo "Fecha" puede rellenarse automáticamente. Confirmar.
3. **Dominio y textos legales** (aviso de privacidad, responsable del tratamiento, a quién escribir para ejercer derechos RGPD).
4. **¿Qué pasa tras enviar?** Mensaje de agradecimiento y, opcionalmente, invitar a dejar un email/teléfono si quieren la llamada.
