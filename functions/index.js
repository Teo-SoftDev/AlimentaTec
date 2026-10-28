// Punto de entrada de Firebase Functions (v2).
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { buildApi } from "./src/app.js";
import { createFirestoreStore } from "./src/stores/firestoreStore.js";

// El secreto del JWT vive en Secret Manager (firebase functions:secrets:set JWT_SECRET). Nunca en el código.
const JWT_SECRET = defineSecret("JWT_SECRET");
let api;
const getApi = () => (api ||= buildApi({ store: createFirestoreStore(), jwtSecret: () => JWT_SECRET.value() }));

export const api_v1 = onRequest({ region: "us-central1", secrets: [JWT_SECRET], maxInstances: 10, memory: "256MiB", timeoutSeconds: 30, cors: false }, (req, res) => getApi().handler(req, res));

// Marca como "sin conexión" a los sensores que dejaron de reportar.
export const sensorWatchdog = onSchedule({ schedule: "every 5 minutes", region: "us-central1" }, async () => {
  await getApi().service.markStaleOffline();
});
