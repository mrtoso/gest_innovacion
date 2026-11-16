/** Datos del sitio. Los valores de institución y contacto se definen por variables de entorno. */
export const siteConfig = {
  studyName: "Estudio sobre la gestión de almacenes en pymes",
  formName: "Cuestionario de gestión de almacén",
  /** Nombre de la institución que realiza el estudio (opcional: si está vacío no se muestra). */
  organization: process.env.NEXT_PUBLIC_ORG_NAME ?? "",
  /** Email de contacto (también para ejercer derechos RGPD). */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  estimatedMinutes: 15,
};
