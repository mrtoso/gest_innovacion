/**
 * ÚNICA fuente de verdad del cuestionario "Gestión Almacén v2".
 *
 * - Los textos de preguntas y opciones salen del PDF `CuestionarioAlmacenes-v2.pdf`
 *   (se han quitado los marcadores de lista "a)", "b)"… y los puntos finales).
 * - `id`: identificador estable (nombre de columna en la hoja). NO lo derivamos del
 *   número visible del PDF, que mezcla numeración original (1–18) y nueva (N1–N29).
 * - `pdfRef`: número tal y como aparece en el PDF, solo para cruzar con el documento.
 * - Valores corregidos por el autor (el PDF los trae corruptos): P3 "Más de 500",
 *   P4 "Más de 10", P10 "Más de 15 minutos".
 */

export const QUESTIONNAIRE_VERSION = "v2";

export type Option = {
  /** Texto literal. También es el valor que se guarda en la hoja. */
  label: string;
  /** Opción excluyente ("Ninguno"…): al marcarla se desmarcan las demás. */
  exclusive?: boolean;
  /** Al elegirla se pide un texto adicional (columna `<id>_otro`). */
  other?: boolean;
};

/** Condición de visibilidad: depende de la respuesta (de selección única) a otra pregunta. */
export type ShowIf = { questionId: string; notEquals: string };

type Base = {
  id: string;
  pdfRef: string;
  text: string;
  help?: string;
  /** Por defecto true. */
  required?: boolean;
  showIf?: ShowIf;
};

export type Question =
  | (Base & { type: "single"; options: Option[] })
  | (Base & { type: "multi"; options: Option[] })
  | (Base & { type: "text"; maxLength?: number })
  | (Base & { type: "textarea"; maxLength?: number })
  | (Base & { type: "number"; unit?: string; max?: number })
  | (Base & {
      type: "scale";
      min: number;
      max: number;
      minLabel: string;
      maxLabel: string;
    });

export type Section = {
  id: string;
  title: string;
  intro?: string;
  questions: Question[];
};

const opts = (...labels: string[]): Option[] => labels.map((label) => ({ label }));

const FRECUENCIA_MENSUAL = opts(
  "Nunca",
  "Menos de una vez al mes",
  "De 1 a 3 veces al mes",
  "De 4 a 12 veces al mes",
  "Más de 12 veces al mes",
);

const SIEMPRE_AVECES_NUNCA = opts("Siempre", "A veces", "Nunca");

export const sections: Section[] = [
  {
    id: "generales",
    title: "Datos generales",
    intro: "Unos datos básicos sobre usted y su empresa.",
    questions: [
      {
        id: "persona",
        pdfRef: "Persona entrevistada",
        type: "text",
        text: "Su nombre y cargo en la empresa",
        maxLength: 150,
      },
      {
        id: "actividad",
        pdfRef: "Breve descripción de la actividad",
        type: "textarea",
        text: "Breve descripción de la actividad de la empresa",
        required: false,
      },
      {
        id: "n1_empleados_empresa",
        pdfRef: "N1",
        type: "single",
        text: "Número total de empleados de la empresa",
        options: opts("1–9", "10–49", "50–249", "250 o más"),
      },
      {
        id: "n2_grupo_cadena",
        pdfRef: "N2",
        type: "single",
        text: "¿La empresa pertenece a un grupo empresarial, cadena o franquicia?",
        options: opts("Sí", "No"),
      },
      {
        id: "n3_puesto",
        pdfRef: "N3",
        type: "single",
        text: "Su puesto en la empresa",
        options: opts(
          "Propietario o gerente",
          "Responsable de almacén",
          "Empleado que trabaja en el almacén",
          "Otro",
        ),
      },
    ],
  },
  {
    id: "s1",
    title: "Información básica del almacén",
    questions: [
      {
        id: "q01_tipo_productos",
        pdfRef: "1",
        type: "single", // TODO(confirmar): ¿admite varias respuestas? El PDF no lo indica.
        text: "¿Qué tipo de productos almacena su empresa?",
        options: [
          { label: "Alimentación" },
          { label: "Materias primas" },
          { label: "Componentes industriales" },
          { label: "Producto terminado" },
          { label: "Otro", other: true },
        ],
      },
      {
        id: "q02_metros2",
        pdfRef: "2",
        type: "number",
        text: "¿Qué tamaño aproximado tiene su almacén (en m²)?",
        unit: "m²",
        max: 1_000_000,
      },
      {
        id: "q03_ubicaciones",
        pdfRef: "3",
        type: "single",
        text: "Número aproximado de ubicaciones de almacenamiento (huecos para paquetes)",
        options: opts("< 50", "50–200", "200–500", "Más de 500"),
      },
      {
        id: "q04_empleados_almacen",
        pdfRef: "4",
        type: "single",
        text: "¿Cuántos empleados intervienen en las tareas de almacén?",
        options: opts("1–2", "3–5", "6–10", "Más de 10"),
      },
      {
        id: "n4_referencias",
        pdfRef: "N4",
        type: "single",
        text: "¿Cuántas referencias o productos distintos guarda aproximadamente?",
        options: opts("Menos de 100", "100–500", "500–2.000", "Más de 2.000"),
      },
      {
        id: "n5_permanencia",
        pdfRef: "N5",
        type: "single",
        text: "¿Cuánto tiempo permanece un producto típico en el almacén?",
        options: opts("Días", "Semanas", "Meses", "Más de un año"),
      },
    ],
  },
  {
    id: "s2",
    title: "Problemas en la colocación de mercancía",
    questions: [
      {
        id: "q05_proceso_estandar",
        pdfRef: "5",
        type: "single",
        text: "¿Existe un proceso estandarizado para colocar los productos que llegan al almacén?",
        options: opts("Sí", "No", "Parcialmente"),
      },
      {
        id: "q06_elementos_proceso",
        pdfRef: "6",
        type: "multi",
        text: "Si lo tiene, ¿cuáles de los siguientes elementos utiliza?",
        showIf: { questionId: "q05_proceso_estandar", notEquals: "No" },
        options: [
          { label: "Etiquetas escritas a mano" },
          { label: "Hojas de Excel" },
          { label: "Software de gestión (ERP, TPV, programa de almacén)" },
          { label: "Sistemas avanzados (RFID, pistolas de código de barras conectadas)" },
          { label: "Registro manual en papel o cuaderno" },
          { label: "Nada formal", exclusive: true },
          { label: "Otros", other: true },
        ],
      },
      {
        id: "n6_frecuencia_recepcion",
        pdfRef: "N6",
        type: "single",
        text: "¿Con qué frecuencia recibe mercancía el almacén?",
        options: opts(
          "Varias veces al día",
          "Una vez al día",
          "Varias veces por semana",
          "Una vez por semana o menos",
        ),
      },
      {
        id: "n7_comprobacion_albaran",
        pdfRef: "N7",
        type: "single",
        text: "Al recibir mercancía, ¿se comprueba contra el pedido o el albarán?",
        options: SIEMPRE_AVECES_NUNCA,
      },
      {
        id: "n8_decision_ubicacion",
        pdfRef: "N8",
        type: "single",
        text: "¿Cómo se decide dónde se coloca cada producto?",
        options: opts(
          "Cada producto tiene una ubicación fija",
          "Por zonas o familias de producto",
          "Donde haya hueco en ese momento",
          "Lo decide en el momento la persona que lo coloca",
        ),
      },
      {
        id: "n9_ubicaciones_rotuladas",
        pdfRef: "N9",
        type: "single",
        text: "¿Las ubicaciones (estanterías, huecos, cajones) están identificadas con un rótulo o código?",
        options: opts("Todas", "Algunas", "Ninguna"),
      },
      {
        id: "n10_anota_ubicacion",
        pdfRef: "N10",
        type: "single",
        text: "Al colocar un producto, ¿se anota en algún sitio dónde queda?",
        options: SIEMPRE_AVECES_NUNCA,
      },
      {
        id: "n11_mismo_colocador_buscador",
        pdfRef: "N11",
        type: "single",
        text: "¿La persona que coloca un producto es la misma que después lo busca?",
        options: opts("Casi siempre", "A veces", "Casi nunca"),
      },
      {
        id: "q07_frecuencia_ubicacion_incorrecta",
        pdfRef: "7",
        type: "single",
        text: "¿Con qué frecuencia se producen problemas por haber colocado productos en una ubicación incorrecta?",
        options: FRECUENCIA_MENSUAL,
      },
      {
        id: "q07_caso",
        pdfRef: "7 (opcional)",
        type: "textarea",
        text: "Describa un caso reciente",
        help: "Opcional",
        required: false,
        // Mejora de usabilidad respecto al PDF: solo tiene sentido si ha habido problemas.
        showIf: { questionId: "q07_frecuencia_ubicacion_incorrecta", notEquals: "Nunca" },
      },
      {
        id: "q08_problemas_almacenar",
        pdfRef: "8",
        type: "multi",
        text: "¿Qué problemas concretos experimentan al almacenar mercancías?",
        options: [
          { label: "Falta de tiempo para registrar las ubicaciones" },
          { label: "Errores humanos en la anotación" },
          { label: "La ubicación física no coincide con la registrada" },
          { label: "Paquetes mal identificados" },
          { label: "No se registra nada, se confía en la memoria" },
          { label: "Ninguno", exclusive: true },
          { label: "Otro", other: true },
        ],
      },
    ],
  },
  {
    id: "s3",
    title: "Problemas en la recogida y acceso a los paquetes",
    questions: [
      {
        id: "q09_metodos_localizar",
        pdfRef: "9",
        type: "single", // TODO(confirmar): ¿admite varias respuestas? El PDF no lo indica.
        text: "¿Qué métodos utilizan actualmente para localizar la mercancía en el almacén?",
        options: [
          { label: "Etiquetas escritas a mano" },
          { label: "Hojas de Excel" },
          { label: "Software de gestión (ERP, TPV, programa de almacén)" },
          { label: "RFID" },
          { label: "Nada formal" },
          { label: "Otros", other: true },
        ],
      },
      {
        id: "q10_tiempo_localizar",
        pdfRef: "10",
        type: "single",
        text: "¿Cuánto tiempo se tarda, de media, en localizar un paquete cuando se necesita?",
        options: opts("< 1 minuto", "1–5 minutos", "5–15 minutos", "Más de 15 minutos"),
      },
      {
        id: "n13_ultima_vez_tardo",
        pdfRef: "N13",
        type: "single",
        text: "La última vez que un producto no aparecía, ¿cuánto se tardó en encontrarlo?",
        options: opts(
          "Menos de 15 minutos",
          "Entre 15 minutos y 1 hora",
          "Más de 1 hora",
          "No llegó a aparecer",
          "No ha ocurrido",
        ),
      },
      {
        id: "n14_busquedas_dia",
        pdfRef: "N14",
        type: "single",
        text: "¿Cuántas veces al día, aproximadamente, se busca o se recoge un producto del almacén?",
        options: opts("Menos de 10", "10–50", "50–200", "Más de 200"),
      },
      {
        id: "q11_errores_localizar",
        pdfRef: "11",
        type: "single",
        text: "¿Con qué frecuencia se producen errores al localizar los paquetes?",
        options: FRECUENCIA_MENSUAL,
      },
      {
        id: "q11_caso",
        pdfRef: "11 (opcional)",
        type: "textarea",
        text: "Describa un caso reciente",
        help: "Opcional",
        required: false,
        showIf: { questionId: "q11_errores_localizar", notEquals: "Nunca" },
      },
      {
        id: "q12_problemas_recuperacion",
        pdfRef: "12",
        type: "multi",
        text: "Si los hay, ¿qué problemas se dan en la recuperación de un paquete?",
        options: [
          { label: "No está donde debería" },
          { label: "El paquete no tiene identificación clara" },
          { label: "Se confunden paquetes similares" },
          { label: "Necesidad de mover otros paquetes para encontrarlo" },
          { label: "Ninguno", exclusive: true },
          { label: "Otro", other: true },
        ],
      },
      {
        id: "q13_razon_no_esta",
        pdfRef: "13",
        type: "single",
        text: "Cuando un producto NO está en su lugar, ¿cuál diría que es la razón principal?",
        options: [
          { label: "Prisas del operario / Exceso de carga de trabajo" },
          { label: "Falta de espacio o desorganización física del almacén" },
          { label: "Fallo al registrar la ubicación en el sistema (Excel/WMS)" },
          { label: "Productos que se mueven o se usan sin registrar el cambio" },
          { label: "Otra (descríbala, por favor)", other: true },
          { label: "No ocurre nunca" },
        ],
      },
      {
        id: "q14_impacto",
        pdfRef: "14",
        type: "multi",
        text: "¿Qué impacto tienen estos errores en su operativa diaria?",
        options: [
          { label: "Retrasos en entregas" },
          { label: "Costes adicionales" },
          { label: "Estrés / sobrecarga del personal" },
          { label: "Dificultad para planificar" },
          { label: "Ninguno", exclusive: true },
          { label: "Otro", other: true },
        ],
      },
      {
        id: "n16_salida_productos",
        pdfRef: "N16",
        type: "single", // TODO(confirmar): ¿admite varias respuestas? El PDF no lo indica.
        text: "¿Cómo salen normalmente los productos del almacén?",
        options: opts(
          "Se preparan pedidos de clientes, uno a uno",
          "Se preparan varios pedidos a la vez",
          "Venta directa en mostrador o tienda",
          "Consumo interno (producción, taller, cocina)",
        ),
      },
      {
        id: "n17_producto_equivocado",
        pdfRef: "N17",
        type: "single",
        text: "¿Con qué frecuencia se entrega o se usa un producto equivocado?",
        options: opts(
          "Nunca",
          "Ocasionalmente (menos de 4 veces al mes)",
          "Con frecuencia (de 4 a 12 veces al mes)",
          "Muy frecuentemente (más de 12 veces al mes)",
        ),
      },
      {
        id: "n18_horas_buscando",
        pdfRef: "N18",
        type: "single",
        text: "En una semana normal, ¿cuánto tiempo dedica en total el personal a buscar productos que no aparecen a la primera?",
        options: opts("Menos de 1 hora", "De 1 a 5 horas", "Más de 5 horas"),
      },
      {
        id: "n19_venta_perdida",
        pdfRef: "N19",
        type: "single",
        text: "En el último año, ¿se ha vuelto a comprar un producto, o se ha perdido una venta, por no encontrar algo que sí estaba en el almacén?",
        options: opts("No", "Sí, alguna vez", "Sí, varias veces"),
      },
    ],
  },
  {
    id: "s31",
    title: "Inventario y control de stock",
    questions: [
      {
        id: "n20_frecuencia_inventario",
        pdfRef: "N20",
        type: "single",
        text: "¿Con qué frecuencia hacen inventario o recuento del almacén?",
        options: opts(
          "Nunca",
          "Una vez al año",
          "Varias veces al año",
          "Cada mes o más a menudo",
          "De forma continua, por partes",
        ),
      },
      {
        id: "n21_coincidencia_recuento",
        pdfRef: "N21",
        type: "single",
        text: "Cuando hacen recuento, ¿coincide lo contado con lo que tenían registrado?",
        options: opts(
          "Casi siempre",
          "Hay pequeñas diferencias",
          "Hay diferencias importantes",
          "No hay registro con el que comparar",
        ),
      },
      {
        id: "n22_sistema_capacidad",
        pdfRef: "N22",
        type: "single",
        text: "A la hora de aceptar pedidos, ¿hay algún tipo de sistema que compruebe de forma automática que el almacén tenga la capacidad suficiente de productos para cumplir la demanda del cliente en un tiempo determinado?",
        options: opts("Sí", "No"),
      },
      {
        id: "n23_caducidades",
        pdfRef: "N23",
        type: "single",
        text: "¿Controlan caducidades o lotes de los productos?",
        options: opts(
          "Sí, con un registro",
          "Sí, de forma visual o de memoria",
          "No hace falta en nuestros productos",
        ),
      },
      {
        id: "n24_registro_salida",
        pdfRef: "N24",
        type: "single",
        text: "Cuando un producto sale del almacén, ¿se registra la salida?",
        options: SIEMPRE_AVECES_NUNCA,
      },
    ],
  },
  {
    id: "s4",
    title: "Sistemas de seguimiento actuales",
    questions: [
      {
        id: "q15_satisfaccion",
        pdfRef: "15",
        type: "single",
        text: "¿Están satisfechos con el sistema actual de localización de paquetes?",
        options: opts("Sí", "Parcialmente", "No"),
      },
      {
        id: "n25_puntuacion",
        pdfRef: "N25",
        type: "scale",
        text: "Puntúe su sistema actual de localización",
        min: 1,
        max: 5,
        minLabel: "1 = nada satisfecho",
        maxLabel: "5 = muy satisfecho",
      },
      {
        id: "q16_tecnologias_tiempo_real",
        pdfRef: "16",
        type: "single",
        text: "¿Han valorado o implementado tecnologías de localización en tiempo real?",
        options: opts(
          "Sí, las usamos",
          "Las hemos evaluado, pero son demasiado caras",
          "Nunca las hemos considerado",
          "No sabemos qué son",
        ),
      },
      {
        id: "n26_conoce_tecnologias",
        pdfRef: "N26",
        type: "multi",
        text: "¿Cuáles de estas tecnologías conoce?",
        options: [
          { label: "Códigos de barras" },
          { label: "Códigos QR" },
          { label: "Etiquetas NFC" },
          { label: "RFID" },
          { label: "Ninguna", exclusive: true },
        ],
      },
      {
        id: "n27_movil",
        pdfRef: "N27",
        type: "single",
        text: "¿Se usa el teléfono móvil en las tareas de almacén?",
        options: opts("No", "Sí, el móvil personal", "Sí, un móvil de empresa"),
      },
      {
        id: "n28_identificacion_comoda",
        pdfRef: "N28",
        type: "single",
        text: "Si tuviera que identificar ubicaciones y productos, ¿qué opción le resultaría más cómoda?",
        options: opts(
          "Etiquetas escritas o impresas, leídas a simple vista",
          "Códigos QR leídos con la cámara del móvil",
          "Etiquetas NFC leídas acercando el móvil",
          "Ninguna, no lo haría",
          "No sabe",
        ),
      },
      {
        id: "n29_pago_mensual",
        pdfRef: "N29",
        type: "single",
        text: "¿Cuánto estaría dispuesto a pagar al mes por un sistema que le dijera dónde está cada producto?",
        options: opts("Nada", "Menos de 20 €", "20–50 €", "50–100 €", "Más de 100 €"),
      },
      {
        id: "q17_comentarios",
        pdfRef: "17",
        type: "textarea",
        text: "¿Querría añadir algún comentario relevante sobre su gestión del almacén o problemas habituales?",
        help: "Opcional",
        required: false,
      },
      {
        id: "q18_almacen_ideal",
        pdfRef: "18",
        type: "textarea",
        text: "Si los costes no fueran problema, ¿cómo sería su gestión de almacén ideal?",
        help: "Opcional",
        required: false,
      },
    ],
  },
];

export const allQuestions: Question[] = sections.flatMap((s) => s.questions);

export const questionById: ReadonlyMap<string, Question> = new Map(
  allQuestions.map((q) => [q.id, q]),
);

export function otherKey(questionId: string): string {
  return `${questionId}_otro`;
}

export function hasOther(q: Question): boolean {
  return (q.type === "single" || q.type === "multi") && q.options.some((o) => o.other);
}
