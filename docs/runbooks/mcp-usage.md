---
title: Uso controlado de MCP
status: active
owner: mantenimiento
last_reviewed: 2026-06-26
---

# Uso controlado de MCP

## Propósito

Los servidores MCP agregan herramientas externas a una sesión de IA. En
AgroGest VSM se usan solo cuando resuelven una tarea concreta. No son una fuente
de verdad, no reemplazan `docs/` y no deben permanecer activos por comodidad.

## Regla base

MCP está deshabilitado por defecto. Se activa por tarea, con alcance explícito,
credenciales mínimas y salida verificable.

Antes de activar un MCP debe quedar claro:

- qué problema resuelve;
- qué datos puede leer;
- si puede escribir o solo leer;
- quién autorizó su uso;
- cómo se revoca al terminar.

## PostgreSQL MCP

El MCP de PostgreSQL solo puede usarse inicialmente en lectura y nunca contra la
base de datos de producción.

Uso permitido:

- inspección de esquema en local o staging;
- consultas `SELECT` acotadas para diagnosticar inconsistencias;
- validación de migraciones después de ejecutarlas en entorno no productivo;
- revisión de índices, constraints y datos semilla no sensibles.

Uso prohibido:

- conexión a producción;
- credenciales con permisos de escritura;
- `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `ALTER`, `DROP` o `CREATE`;
- lectura masiva de datos personales;
- guardar cadenas de conexión en archivos versionados.

La credencial recomendada debe tener permisos mínimos equivalentes a:

```sql
GRANT CONNECT ON DATABASE agrogest TO agrogest_ai_readonly;
GRANT USAGE ON SCHEMA public TO agrogest_ai_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO agrogest_ai_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO agrogest_ai_readonly;
```

La cadena de conexión debe vivir en el entorno local del desarrollador, por
ejemplo `AGROGEST_MCP_DATABASE_URL_READONLY`, no en Git.

## GitHub MCP

GitHub MCP se evalúa por coste de contexto. Para trabajo local se prefieren
comandos Git y GitHub CLI acotados porque son más predecibles y baratos en
tokens.

Uso razonable:

- revisar estado de PR;
- comprobar checks remotos;
- consultar issues o releases vinculados a una tarea;
- preparar un resumen de revisión.

Evitar:

- cargar el repositorio completo por MCP;
- duplicar información que ya está en `git diff`, `git log` o `docs/`;
- usarlo si un comando local entrega el mismo resultado con menos contexto.

## Configuración

No se versiona una configuración MCP con secretos ni conexiones reales. Si una
tarea exige MCP, se usa una configuración local temporal o el almacén seguro de
la herramienta.

Plantilla conceptual, no lista para copiar con secretos reales:

```json
{
  "mcp": {
    "postgres-local-readonly": {
      "enabled": false,
      "description": "Solo lectura para local/staging; nunca producción",
      "env": ["AGROGEST_MCP_DATABASE_URL_READONLY"]
    }
  }
}
```

## Cierre de tarea

Al terminar:

1. registrar hallazgos en la spec, runbook o issue correspondiente;
2. revocar o desactivar el MCP si era temporal;
3. eliminar variables locales si ya no se necesitan;
4. confirmar que no se versionaron secretos;
5. ejecutar validaciones proporcionales.

