/**
 * lib/legal.js
 * ─────────────────────────────────────────────────────────────────────────
 * Textos legales que se muestran en la app (Términos de uso y Política de
 * tratamiento de datos personales, Ley 1581 de 2012) y la versión vigente.
 *
 * ANTES DE PUBLICAR:
 *   1. Completa todos los campos "[COMPLETAR: …]" de LEGAL.
 *   2. Haz revisar los textos por un abogado (son una base, no asesoría legal).
 *   3. Si cambias el contenido de forma importante, sube TERMS_VERSION: la
 *      app volverá a pedir la aceptación a todos los usuarios.
 */

export const TERMS_VERSION = "2026-10-13";

export const LEGAL = {
  app: "Mi Libro de Cuentas",
  responsable: "[COMPLETAR: nombre completo del responsable]",
  documento: "[COMPLETAR: cédula o NIT]",
  domicilio: "[COMPLETAR: ciudad, Colombia]",
  correo: "[COMPLETAR: correo para consultas, reclamos y soporte]",
  regionServidores: "[COMPLETAR: región de Supabase, p. ej. Estados Unidos (us-east-1)]",
  vigenteDesde: "13 de octubre de 2026",
};

/** ¿Quedan campos por completar? (la app lo avisa en consola de desarrollo) */
export const LEGAL_PENDING = Object.entries(LEGAL)
  .filter(([, v]) => String(v).startsWith("[COMPLETAR"))
  .map(([k]) => k);

const L = LEGAL;

export const POLICY = {
  id: "policy",
  title: "Política de tratamiento de datos personales",
  sections: [
    {
      h: "1. Responsable del tratamiento",
      p: [
        `${L.responsable}, identificado(a) con ${L.documento}, con domicilio en ${L.domicilio}, es el responsable del tratamiento de los datos personales que se recogen a través de ${L.app}.`,
        `Canal para consultas, reclamos y solicitudes: ${L.correo}.`,
      ],
    },
    {
      h: "2. Marco legal",
      p: [
        "Esta política se rige por la Ley 1581 de 2012 (régimen general de protección de datos personales), el Decreto 1377 de 2013 (incorporado en el Decreto 1074 de 2015) y las demás normas que las modifiquen o complementen.",
      ],
    },
    {
      h: "3. Qué datos tratamos",
      b: [
        "Datos de la cuenta: correo electrónico y contraseña (la contraseña la gestiona el proveedor de autenticación y no la conocemos).",
        "Datos financieros que tú mismo registras: ingresos, gastos, categorías, presupuesto, metas, inversiones y el día de pago.",
        "Datos de uso del servicio: estado y fecha de vencimiento de tu acceso, y la fecha y versión en que aceptaste estos textos.",
        "No pedimos datos bancarios de acceso (usuarios o claves de tus bancos), no nos conectamos a tus cuentas y no recolectamos datos sensibles. Si importas un extracto, lo haces tú de forma voluntaria y solo se guardan los movimientos que confirmes.",
      ],
    },
    {
      h: "4. Para qué usamos tus datos",
      b: [
        "Crear y administrar tu cuenta y autenticarte.",
        "Prestar las funciones de la app: registrar movimientos, calcular ciclos de pago, presupuestos, metas, inversiones e indicadores.",
        "Gestionar tu acceso de prueba, su activación y vencimiento, y, cuando exista, tu suscripción.",
        "Enviarte comunicaciones propias del servicio (por ejemplo, avisos sobre el acceso o la seguridad de tu cuenta).",
        "Atender tus consultas, reclamos y solicitudes de soporte, y mantener la seguridad del servicio.",
        "No vendemos tus datos ni los usamos para publicidad de terceros.",
      ],
    },
    {
      h: "5. Autorización",
      p: [
        "Al crear tu cuenta marcas la casilla de aceptación, con lo cual nos das tu autorización previa, expresa e informada para tratar tus datos según esta política. Guardamos la fecha y la versión de tu aceptación como prueba. Puedes revocar la autorización eliminando tu perfil desde el menú Mi perfil o escribiéndonos.",
      ],
    },
    {
      h: "6. Tus derechos como titular",
      b: [
        "Conocer, actualizar y rectificar tus datos.",
        "Solicitar prueba de la autorización que nos diste.",
        "Ser informado sobre el uso que se ha dado a tus datos.",
        "Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley.",
        "Revocar la autorización y solicitar la supresión de tus datos.",
        "Acceder de forma gratuita a tus datos personales.",
      ],
    },
    {
      h: "7. Cómo ejercer tus derechos",
      p: [
        "Dentro de la app: en el menú Mi perfil puedes descargar una copia de tus datos y eliminar tu perfil con todos tus datos, de forma inmediata.",
        `Por correo: escribe a ${L.correo} indicando tu solicitud y el correo de tu cuenta. Las consultas se responden en máximo diez (10) días hábiles, prorrogables por cinco (5) días hábiles más, y los reclamos en máximo quince (15) días hábiles, prorrogables por ocho (8) días hábiles más, informándote los motivos de la prórroga.`,
      ],
    },
    {
      h: "8. Proveedores que intervienen en el tratamiento",
      p: [
        `Para operar el servicio usamos proveedores tecnológicos que actúan como encargados: Supabase (base de datos y autenticación) y Vercel (alojamiento de la aplicación). Tus datos se almacenan en servidores ubicados en: ${L.regionServidores}, por lo que pueden ser tratados fuera de Colombia. Al aceptar esta política autorizas esa transmisión y almacenamiento.`,
      ],
    },
    {
      h: "9. Seguridad",
      p: [
        "Aplicamos medidas técnicas razonables para proteger tu información: conexión cifrada, autenticación de usuarios y reglas de acceso a nivel de base de datos para que cada persona solo pueda ver sus propios datos. Ningún sistema es completamente infalible; te recomendamos usar una contraseña única y no compartirla.",
      ],
    },
    {
      h: "10. Conservación y eliminación",
      p: [
        "Conservamos tus datos mientras tu cuenta exista. Si eliminas tu perfil, se borran tu cuenta y todos tus datos registrados. Las copias de respaldo del proveedor pueden conservarse durante un período limitado y se eliminan de forma automática.",
      ],
    },
    {
      h: "11. Menores de edad",
      p: [
        "El servicio está dirigido a personas mayores de 18 años. No recolectamos intencionalmente datos de menores de edad; si crees que un menor creó una cuenta, escríbenos para eliminarla.",
      ],
    },
    {
      h: "12. Cambios a esta política",
      p: [
        `Esta política rige desde el ${L.vigenteDesde}. Si la modificamos de forma importante te lo informaremos en la app y te pediremos aceptarla de nuevo.`,
      ],
    },
  ],
};

export const TERMS = {
  id: "terms",
  title: "Términos de uso",
  sections: [
    {
      h: "1. Qué es el servicio",
      p: [
        `${L.app} es una herramienta web para organizar tus finanzas personales: registrar ingresos y gastos, definir un presupuesto por ciclos de pago, y hacer seguimiento a metas e inversiones. Al crear tu cuenta aceptas estos términos.`,
      ],
    },
    {
      h: "2. Tu cuenta",
      b: [
        "Debes ser mayor de 18 años y darnos un correo válido.",
        "Eres responsable de mantener la confidencialidad de tu contraseña y de lo que ocurra en tu cuenta.",
        "Cada persona debe usar su propia cuenta; no la compartas ni la vendas.",
      ],
    },
    {
      h: "3. Acceso de prueba y suscripción",
      p: [
        "Puedes activar un acceso de prueba con el código de un bono. El acceso de prueba tiene la duración que indique el bono (por ejemplo, 90 días contados desde su activación) y se activa una sola vez por cuenta.",
        "Las condiciones y el precio de una eventual suscripción se informarán antes de cobrarte cualquier valor; no se hará ningún cobro sin tu aceptación expresa.",
      ],
    },
    {
      h: "4. Qué pasa cuando vence el acceso",
      p: [
        "Al vencer el acceso de prueba tu cuenta pasa a modo de solo lectura: puedes ver y exportar tus datos, pero no registrar ni modificar información. Puedes eliminar tu perfil en cualquier momento.",
      ],
    },
    {
      h: "5. Uso aceptable",
      b: [
        "No intentes acceder a datos de otras personas, vulnerar la seguridad del servicio ni interferir con su funcionamiento.",
        "No uses el servicio para actividades ilegales ni para cargar información que no te pertenezca.",
        "Podemos suspender cuentas que incumplan estos términos o pongan en riesgo el servicio.",
      ],
    },
    {
      h: "6. Tus datos",
      p: [
        "La información que registras es tuya. Su exactitud es tu responsabilidad: los indicadores y proyecciones se calculan con lo que tú ingresas. El tratamiento de tus datos personales se rige por la Política de tratamiento de datos personales.",
      ],
    },
    {
      h: "7. No es asesoría financiera",
      p: [
        `${L.app} es una herramienta de organización. Sus indicadores, proyecciones y mensajes son informativos y no constituyen asesoría financiera, contable, tributaria, legal ni de inversión. Las decisiones que tomes con base en ellos son tuyas.`,
      ],
    },
    {
      h: "8. Disponibilidad y responsabilidad",
      p: [
        "Trabajamos para que el servicio funcione de forma continua, pero se ofrece \"tal como está\": puede haber interrupciones, errores o cambios. En la medida permitida por la ley, no respondemos por pérdidas indirectas derivadas del uso o de la imposibilidad de usar el servicio. Te recomendamos descargar copias de tus datos periódicamente desde el menú Mi perfil.",
      ],
    },
    {
      h: "9. Propiedad intelectual",
      p: [
        `El software, el diseño y la marca ${L.app} pertenecen a su titular. Estos términos no te transfieren ningún derecho sobre ellos, salvo el de usar el servicio mientras tu acceso esté vigente.`,
      ],
    },
    {
      h: "10. Eliminación de la cuenta",
      p: [
        "Puedes eliminar tu perfil y todos tus datos desde el menú Mi perfil. La eliminación es inmediata e irreversible.",
      ],
    },
    {
      h: "11. Cambios a los términos",
      p: [
        `Estos términos rigen desde el ${L.vigenteDesde}. Si los modificamos de forma importante te lo informaremos en la app y te pediremos aceptarlos de nuevo.`,
      ],
    },
    {
      h: "12. Ley aplicable y contacto",
      p: [
        `Estos términos se rigen por las leyes de la República de Colombia. Para cualquier duda escríbenos a ${L.correo}.`,
      ],
    },
  ],
};

export const LEGAL_DOCS = { policy: POLICY, terms: TERMS };
