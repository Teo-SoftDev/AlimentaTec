# Simulador de sensores AlimentaTec

Dos formas de simular sensores de campo contra la API (`/api/v1`):

## A) CLI (Node ≥ 18, sin dependencias)

```bash
# 1) API local de desarrollo (clave efímera impresa al arrancar; nunca se versiona)
cd functions && STORE=memory node src/server.js

# 2) Simulador (otra terminal)
node tools/sensor-simulator/simulate.mjs --device SN-SIM001 --key <API_KEY> --pond AQ-04
```

Variables de entorno equivalentes: `ALIMENTATEC_API_URL`, `ALIMENTATEC_DEVICE_ID`, `ALIMENTATEC_API_KEY`, `ALIMENTATEC_POND_ID`.

| Objetivo | Comando |
|---|---|
| Lecturas normales cada 5 s | `--mode normal --interval 5` |
| **Alerta crítica de oxígeno** (< 5,2 mg/L) | `--mode low-oxygen --count 8 --interval 2` |
| Temperatura / pH / nivel críticos | `--mode high-temp` · `--mode ph-drift` · `--mode low-level` |
| Usar JWT de corta vida | `--jwt` |
| Pérdida de red y reenvío en lote | `--mode offline --batch 10` |
| Idempotencia (reenvío) | `--mode replay` |
| Validación de esquemas (422) | `--mode invalid` |
| Autenticación fallida (401) | `--mode bad-auth` |
| Límite de tasa (429) | `--mode burst` |
| Resultados reproducibles | `--seed 42` |

Contra Firebase: use la URL de Hosting (`https://<proyecto>.web.app/api/v1`) y la **API key mostrada una sola vez** al
registrar el dispositivo (tipo *Sensor multiparamétrico*) en *Dispositivos → Registrar dispositivo*.

## B) Postman

1. Importe `postman/AlimentaTec-Sensor-API.postman_collection.json` y `postman/AlimentaTec-Local.postman_environment.json`.
2. En el entorno complete `baseUrl`, `deviceId`, `apiKey` (y `pondId`).
3. Cambie `mode` (`normal`, `low-oxygen`, `high-temp`, `ph-drift`, `low-level`) y ejecute con el *Collection Runner*
   (p. ej. 10 iteraciones, 2 s de retardo) para ver cómo el estanque pasa a **rojo** y se genera la alerta.
4. La carpeta *Pruebas negativas* comprueba 422/401/403.

Cada petición incluye pruebas automáticas (status, idempotencia, JWT, lote offline).
