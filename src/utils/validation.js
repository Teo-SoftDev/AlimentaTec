// src/utils/validation.js — A03 Injection / integridad lógica: validación
// estricta y tipada con Zod. Allowlists (enums + regex) en vez de blocklists.
import { z } from "zod";
import { sanitizeText, sanitizeMultiline } from "./sanitize.js";

export { sanitizeText, sanitizeMultiline };

/* ---------- helpers ---------- */
export function fieldErrors(zerr) {
  const out = {};
  for (const i of zerr.issues) {
    const k = i.path.join(".") || "_";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}
export function validate(schema, data) {
  const r = schema.safeParse(data);
  return r.success ? { ok: true, data: r.data } : { ok: false, errors: fieldErrors(r.error) };
}

const normalizeSpaces = (s) => String(s ?? "").trim().replace(/\s+/g, " ");
const TEXT_RE = /^[\p{L}\p{N}\p{M} .,_\-#()/'’:+%&]+$/u;
const safeText = (min, max, label = "Texto") =>
  z
    .string({ required_error: `${label} es obligatorio` })
    .transform(normalizeSpaces) // solo normaliza espacios: los caracteres peligrosos se RECHAZAN
    .pipe(
      z
        .string()
        .min(min, `${label}: mínimo ${min} caracteres`)
        .max(max, `${label}: máximo ${max} caracteres`)
        .regex(TEXT_RE, `${label} contiene caracteres no permitidos`)
    );

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .refine((s) => !Number.isNaN(Date.parse(s + "T00:00:00Z")), "Fecha inválida");

const POND_ID = z.string().regex(/^[A-Z]{2}-\d{2}$/, "Identificador de estanque inválido");

/* ---------- contraseñas (A07) ---------- */
export const PASSWORD_RULES = [
  { id: "len", label: "Mínimo 12 caracteres", test: (p) => p.length >= 12 },
  { id: "upper", label: "Una letra mayúscula", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "Una letra minúscula", test: (p) => /[a-z]/.test(p) },
  { id: "digit", label: "Un número", test: (p) => /\d/.test(p) },
  { id: "symbol", label: "Un símbolo (!@#$…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
  { id: "space", label: "Sin espacios", test: (p) => !/\s/.test(p) },
];
export const getPasswordStrength = (p) => PASSWORD_RULES.filter((r) => r.test(p || "")).length;

export const passwordSchema = z
  .string()
  .max(128, "Máximo 128 caracteres")
  .superRefine((p, ctx) => {
    const failed = PASSWORD_RULES.filter((r) => !r.test(p));
    if (failed.length) ctx.addIssue({ code: "custom", message: `La contraseña no cumple: ${failed.map((f) => f.label.toLowerCase()).join(", ")}` });
  });

export const emailSchema = z.string().trim().toLowerCase().email("Correo inválido").max(254, "Correo demasiado largo");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingrese su contraseña").max(128),
});

export const registerSchema = z
  .object({
    nombre: z
      .string()
      .transform(normalizeSpaces)
      .pipe(z.string().min(2, "Nombre demasiado corto").max(80).regex(/^[\p{L}\p{M}' .-]+$/u, "El nombre solo admite letras")),
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string(),
    terms: z.literal(true, { errorMap: () => ({ message: "Debe aceptar la política de uso" }) }),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden" });

/* ---------- dispositivos ---------- */
export const SERIAL_RE = /^[A-Z0-9]{2,6}(-[A-Z0-9]{2,12}){1,3}$/;
export const DEVICE_TYPES = ["tolva", "sensor"];
export const PROTOCOLS = ["LoRaWAN", "WiFi", "4G"];

export const deviceSchema = z.object({
  serial: z.string().trim().toUpperCase().regex(SERIAL_RE, "Serial inválido (ej. SN-AQ8832)"),
  name: safeText(2, 60, "Nombre"),
  type: z.enum(DEVICE_TYPES, { errorMap: () => ({ message: "Tipo inválido" }) }),
  pondId: POND_ID,
  protocol: z.enum(PROTOCOLS, { errorMap: () => ({ message: "Protocolo inválido" }) }),
  firmware: z.string().regex(/^\d{1,2}\.\d{1,2}\.\d{1,3}$/, "Versión inválida (ej. 2.4.11)").default("1.0.0"),
});

// Payload del QR de aprovisionamiento (máx. 512 bytes).
export const qrPayloadSchema = z.object({
  v: z.literal(1),
  serial: z.string().trim().toUpperCase().regex(SERIAL_RE),
  type: z.enum(DEVICE_TYPES).optional(),
  fw: z.string().regex(/^\d{1,2}\.\d{1,2}\.\d{1,3}$/).optional(),
});

/* ---------- lotes de peces ---------- */
export const BATCH_STAGES = ["alevinaje", "crecimiento", "engorde", "adulto"];
export const FEED_TYPES = ["pellet", "biomasa", "micro", "gránulo"];

export const batchSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,24}$/, "Código: 3-24 caracteres (A-Z, 0-9, guion)"),
  name: safeText(2, 80, "Nombre"),
  species: safeText(3, 80, "Especie"),
  pondId: POND_ID,
  stage: z.enum(BATCH_STAGES),
  population: z.number({ invalid_type_error: "Población inválida" }).int("Debe ser entero").min(1, "Mínimo 1").max(1_000_000, "Máximo 1.000.000"),
  avgWeightG: z.number({ invalid_type_error: "Peso inválido" }).min(0.1, "Mínimo 0,1 g").max(50_000, "Máximo 50.000 g"),
  waterTempC: z.number().min(0, "Temperatura inválida").max(40, "Temperatura inválida"),
  feedType: z.enum(FEED_TYPES),
  autoFeeding: z.boolean(),
  quarantine: z.boolean(),
  notes: z.string().transform(sanitizeMultiline).pipe(z.string().max(500, "Máximo 500 caracteres")),
});

/* ---------- horarios ---------- */
export const DAYS = ["L", "M", "X", "J", "V", "S", "D"];
export const MECHANISMS = ["compuerta", "neumatica", "acustica"];
export const SENSORS = ["oxygen", "temperature", "ph", "turbidity"];

export const conditionSchema = z.object({
  sensor: z.enum(SENSORS),
  op: z.enum(["<", ">"]),
  value: z.number().min(-50).max(1000),
  action: z.enum(["pause", "reduce", "increase"]),
});

export const scheduleSchema = z.object({
  name: safeText(2, 60, "Nombre"),
  pondId: POND_ID,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:MM)"),
  days: z.array(z.enum(DAYS)).min(1, "Seleccione al menos un día").max(7),
  mechanism: z.enum(MECHANISMS),
  durationSec: z.number().int().min(5, "Mínimo 5 s").max(180, "Máximo 180 s"),
  doseKg: z.number().min(0.1, "Mínimo 0,1 kg").max(50, "Máximo 50 kg"),
  enabled: z.boolean(),
  conditions: z.array(conditionSchema).max(5, "Máximo 5 condiciones"),
});

/* ---------- dosificación ---------- */
export const dosingSchema = z
  .object({
    deviceId: z.string().regex(/^[A-Za-z0-9-]{3,32}$/),
    portionG: z.number().min(50, "Mínimo 50 g").max(500, "Máximo 500 g"),
    mode: z.enum(["biomasa", "fija"]),
    radiusM: z.number().min(1.5).max(5),
    hoppers: z
      .array(z.object({ id: z.enum(["A", "B", "C"]), percent: z.number().int().min(0).max(100) }))
      .length(3),
  })
  .refine((d) => d.hoppers.reduce((s, h) => s + h.percent, 0) === 100, {
    path: ["hoppers"],
    message: "La mezcla de tolvas debe sumar exactamente 100%",
  });

/* ---------- comandos a actuadores ---------- */
export const COMMAND_TYPES = ["dispense_manual", "dispense_test", "toggle_auto", "emergency_stop"];
export const commandSchema = z
  .object({
    type: z.enum(COMMAND_TYPES),
    deviceId: z.string().regex(/^(ALL|[A-Za-z0-9-]{3,32})$/, "Dispositivo inválido"),
    pondId: POND_ID.optional(),
    amountG: z.number().int().min(1).max(5000).optional(),
    rations: z.number().int().min(1).max(20).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((c) => c.deviceId !== "ALL" || c.type === "emergency_stop", { message: "ALL solo aplica a parada de emergencia" });

/* ---------- reportes / historial (filtros) ---------- */
export const REPORT_METRICS = ["feed", "fcr", "growth", "incidents"];

export const reportFilterSchema = z
  .object({
    metrics: z.array(z.enum(REPORT_METRICS)).min(1, "Seleccione al menos una métrica"),
    from: isoDate,
    to: isoDate,
    ponds: z.array(POND_ID).min(1, "Seleccione al menos un estanque").max(20),
  })
  .superRefine((d, ctx) => {
    const a = Date.parse(d.from), b = Date.parse(d.to);
    if (a > b) ctx.addIssue({ code: "custom", path: ["to"], message: "La fecha final debe ser posterior a la inicial" });
    else if ((b - a) / 864e5 > 366) ctx.addIssue({ code: "custom", path: ["to"], message: "El rango máximo es de 366 días" });
  });

export const historyFilterSchema = z.object({
  from: isoDate.or(z.literal("")),
  to: isoDate.or(z.literal("")),
  type: z.string().regex(/^[a-z_]{1,32}$/).or(z.literal("all")),
  pond: POND_ID.or(z.literal("")),
  q: z.string().transform(sanitizeText).pipe(z.string().max(80)),
});
