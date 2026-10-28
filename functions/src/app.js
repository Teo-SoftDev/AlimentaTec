// Ensambla servicio + handler con el almacén indicado.
import { loadConfig } from "./config.js";
import { createAudit } from "./auditService.js";
import { createHandler } from "./httpHandler.js";
import { createIngestService } from "./ingestService.js";
import { createLimiters } from "./rateLimiter.js";

export function buildApi({ store, env = process.env, clock = Date.now, jwtSecret }) {
  const config = loadConfig(env);
  const limiters = createLimiters(config);
  const audit = createAudit({ store, config, clock });
  const service = createIngestService({ store, config, limiters, audit, clock, jwtSecret: jwtSecret || (() => env.JWT_SECRET) });
  const handler = createHandler({ service, config, limiters, audit });
  const sweeper = setInterval(() => Object.values(limiters).forEach((l) => l.sweep()), 60_000);
  sweeper.unref?.();
  return { config, limiters, audit, service, handler };
}
