---
title: Registro de riesgos
status: active
owner: mantenimiento
last_reviewed: 2026-07-08
---

# Registro de riesgos

| ID    | Riesgo                                                                                  | Severidad | Estado                 | Tratamiento                                          |
| ----- | --------------------------------------------------------------------------------------- | --------- | ---------------------- | ---------------------------------------------------- |
| R-001 | Las migraciones backend no crean el esquema completo desde cero                         | Crítica   | Cerrado                | Bootstrap y smoke test PostgreSQL/PostGIS aprobados  |
| R-002 | `pnpm check` falla por parsing Flow de React Native en una suite de recetas             | Alta      | Cerrado                | Repositorios nativos aislados; suite global verde    |
| R-003 | Login sin rate limiting detectado                                                       | Alta      | Cerrado                | 5 intentos/minuto; smoke test confirma HTTP 429      |
| R-004 | Documentación de deploy API no coincide totalmente con `render.yaml`                    | Media     | Cerrado                | Runbook reconciliado con migración y seed            |
| R-005 | No existe staging formal ni rollback probado                                            | Alta      | Abierto                | Diseñar entornos y simulacro de recuperación         |
| R-006 | Backups y restauración no están documentados ni comprobados                             | Crítica   | Cerrado                | Backup y restore local verificados sin Docker        |
| R-007 | Hotspots grandes en visitas, migraciones SQLite, sync y CSS                             | Media     | Aceptado temporalmente | Refactorizar por riesgo y cambios reales             |
| R-008 | `packages/contracts` tiene adopción limitada y existe estructura duplicada en admin web | Media     | Abierto                | Auditar uso y consolidar                             |
| R-009 | Validación geoespacial autoritativa es parcial                                          | Alta      | Abierto                | Completar spec y reglas backend                      |
| R-010 | Configuración y notas de IA podrían duplicar conocimiento                               | Media     | Mitigado               | `docs/` es vault único y política documental activa  |
| R-011 | Staging todavía no está provisionado                                                    | Alta      | Abierto                | Crear recursos separados antes del siguiente piloto  |
| R-012 | TLS del pooler no verifica actualmente la CA                                            | Media     | Abierto                | Instalar CA de Supabase y activar validación         |
| R-013 | Rate limiting usa memoria de una sola instancia                                         | Media     | Aceptado temporalmente | Migrar a almacenamiento compartido al escalar        |
| R-014 | Backups gestionados del proveedor no han sido auditados                                 | Alta      | Abierto                | Verificar plan, retención y restauración en Supabase |
| R-015 | El bootstrap fresco puede conservar índices únicos equivalentes con nombres distintos   | Baja      | Aceptado temporalmente | Auditar catálogo e índices antes de nuevas migraciones |

| R-016 | Integracion Cost-Build expone lectura masiva de datos personales por API key            | Alta      | Mitigado               | API key dedicada, secreto fuera de Git, rotacion si se comparte y endpoint solo lectura |

## Revisión

Actualizar este registro cuando:

- aparezca una incidencia;
- se acepte deuda técnica;
- cambie un entorno;
- se cierre una mitigación;
- una spec introduzca un riesgo temporal.
