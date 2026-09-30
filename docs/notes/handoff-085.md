# Handoff: Proxy de API por el mismo origen del panel

## Identificación

- fecha: 2026-09-28
- responsable: Codex
- spec: 085, aprobada por instrucción explícita del mantenedor
- alcance del diff: panel Next.js, Dockerfile/Compose y documentación de despliegue
- criticidad: alta

## Objetivo

El panel abierto desde la LAN no debe llamar a la IP pública de la API, ya que
esa ruta vence por tiempo desde la red interna.

## Cambios realizados

- `/api/*` en Next.js envía al servicio API por `API_INTERNAL_URL`.
- El proxy sobrescribe `X-Forwarded-For` con la IP del socket para evitar que
  una cabecera del cliente afecte el rate limiting de login.
- El target Docker fija `NEXT_PUBLIC_API_URL=/api` y usa
  `API_INTERNAL_URL=http://api:3001` por defecto; el Compose de desarrollo lo
  pasa explícitamente.
- Next falla si el panel se configura para `/api` sin destino interno.
- Se documentaron configuración, validación y rollback.

## Contratos y datos afectados

- API: endpoints y DTO sin cambios; solo transporte del panel.
- PostgreSQL/PostGIS: sin cambios.
- SQLite/outbox: sin cambios.
- Autenticación y permisos: tokens y guards sin cambios; revisar el proxy de
  cabeceras y el limitador de login.
- Variables y despliegue: `NEXT_PUBLIC_API_URL`, `API_INTERNAL_URL`.

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| ---------------- | --------- |
| Lint y typecheck del panel | Pasaron |
| 5 pruebas unitarias de configuración/cabeceras | Pasaron |
| Build Next.js con `/api` | Pasó |
| `docker compose config --quiet` | Pasó |
| Smoke HTTP local del proxy | Conservó método, ruta, query, cuerpo, Authorization, estado y Content-Disposition; sobrescribió X-Forwarded-For |
| `pnpm docs:check` | Pasó |

## Riesgos conocidos y exclusiones

- El Compose de producción se inspeccionó en `upstream/produccion`: aún pasa la
  URL pública antigua como argumento. El Dockerfile actualizado ya no consume
  ese argumento, pero falta integrar el cambio en esa rama, reconstruir la
  imagen y validar login desde LAN y desde fuera.
- La exposición directa de la API y su `APP_TRUST_PROXY` efectivo son externos
  a esta spec; revisar que ese acceso directo no confíe en cabeceras de IP de
  clientes arbitrarios.
- `pnpm ai:review` no ejecutó la revisión: OpenCode trató `deepseek-reviewer`
  como subagente y cayó al agente predeterminado. Se detuvo la ejecución para
  respetar el requisito de revisión en modo lectura.

## Instrucciones al reviewer

- Revisar solo el alcance descrito, sin modificar archivos.
- Priorizar defectos reproducibles del proxy, seguridad de cabeceras, flujo de
  petición/respuesta y compatibilidad de build/despliegue.
- Citar archivo y línea; devolver veredicto y hallazgos por severidad.
