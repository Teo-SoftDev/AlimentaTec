// A03: validación estricta (.strict() rechaza campos desconocidos) con rangos físicos.
import { z } from "zod";

export const DEVICE_ID = z.string().regex(/^[A-Z0-9]{2,6}(-[A-Z0-9]{2,12}){1,3}$/, "deviceId inválido");
export const POND_ID = z.string().regex(/^[A-Z]{2}-\d{2}$/, "pondId inválido");
export const READING_ID = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "readingId inválido");

export const SENSOR_TYPES = ["multiparametric", "temperature", "ph", "oxygen", "level"];

const readings = z
  .object({
    temperature: z.number().min(-5).max(45).optional(),
    ph: z.number().min(0).max(14).optional(),
    oxygen: z.number().min(0).max(25).optional(),
    waterLevel: z.number().min(0).max(100).optional(), // % de capacidad del estanque
  })
  .strict()
  .refine((r) => Object.keys(r).length > 0, "Debe incluir al menos una lectura");

export const telemetrySchema = z
  .object({
    readingId: READING_ID, // idempotencia: reenviar la misma lectura no la duplica
    pondId: POND_ID,
    sensorType: z.enum(SENSOR_TYPES).default("multiparametric"),
    ts: z.union([z.number().int(), z.string().datetime({ offset: true })]).optional(),
    readings,
    battery: z.number().int().min(0).max(100).optional(),
    rssi: z.number().int().min(-130).max(0).optional(),
    firmware: z.string().regex(/^\d{1,2}\.\d{1,2}\.\d{1,3}$/).optional(),
  })
  .strict();

export const batchSchema = z.object({ readings: z.array(telemetrySchema).min(1) }).strict();

export const headersSchema = z.object({
  deviceId: DEVICE_ID,
  key: z.string().min(20).max(512),
});

export function toMillis(ts) {
  if (ts === undefined) return undefined;
  return typeof ts === "number" ? ts : Date.parse(ts);
}
