# AGENTS.md

## Propósito

Este archivo es la entrada operativa para cualquier asistente de IA que trabaje
en AgroGest VSM. La documentación oficial está en `docs/`, cuyo índice canónico
es `docs/index.md`.

## Producto

AgroGest VSM gestiona productores, sectores, parcelas y visitas agronómicas.
Incluye:

- API NestJS + Fastify + TypeORM + PostgreSQL/PostGIS;
- aplicación Expo/React Native offline-first con SQLite y outbox;
- panel Next.js para administración, seguridad, visitas, mapas y catálogos;
- paquetes compartidos TypeScript.

## Estructura

```text
apps/api         Backend
apps/mobile      Aplicación móvil
apps/admin-web   Panel administrativo
packages         Utilidades, validaciones y contratos
docs             Documentación oficial y vault de Obsidian
tools            Herramientas auxiliares
```

## Comandos canónicos

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm check
pnpm build
```

El estado y los riesgos de estos comandos se registran en
`docs/operations/risk-register.md`.

## Reglas de trabajo

1. Leer `docs/index.md` antes de cambios amplios.
2. No modificar archivos fuera del alcance solicitado.
3. Preservar cambios locales y trabajo no relacionado.
4. No ejecutar operaciones destructivas sin autorización.
5. No introducir secretos ni datos reales en código, logs o documentación.
6. Toda modificación de DB, sync, seguridad, geodatos o contrato entre apps
   requiere una spec completa.
7. Las migraciones deben incluir estrategia de compatibilidad y rollback.
8. Los cambios mobile offline deben conservar orden padre-hijos, idempotencia y
   recuperación tras desconexión.
9. La autorización del frontend no sustituye los guards y roles de la API.
10. Ejecutar validaciones proporcionales antes de declarar una tarea terminada.

## SDD y especificaciones

Las specs viven exclusivamente en `docs/specs/`. No existe ni debe crearse un
directorio `specs/` en la raíz.

- Usar `docs/specs/TEMPLATE.md`.
- Asignar el siguiente número incremental disponible.
- Nombrar el archivo `NNN-titulo-breve.md`.
- Mantener la spec en `draft` hasta aprobación humana.
- No implementar una spec crítica que todavía no esté `approved`.
- Al finalizar, registrar `implemented_in` y actualizar la documentación activa.

Política completa: `docs/specs/README.md`.

## Documentación

`docs/` es la única documentación oficial y también el vault de Obsidian.

- No crear otro vault o wiki como fuente paralela.
- Revisar primero `docs/index.md` antes de crear un documento.
- Actualizar el documento vigente en vez de duplicarlo.
- Las notas de `docs/notes/` son temporales.
- Las decisiones se registran como ADR.
- Las specs implementadas conservan historial, pero no sustituyen la
  arquitectura vigente.
- Todo cambio debe evaluar impacto documental.

Política completa: `docs/governance/documentation-policy.md`.

## Áreas críticas

- autenticación, refresh tokens, roles y secretos;
- esquema PostgreSQL y migraciones;
- SQLite, outbox y reconciliación;
- geodatos de parcelas;
- despliegue y rollback;
- datos personales de usuarios y productores.

## Flujo de IA

- Codex actúa inicialmente como orquestador e implementador principal.
- El explorador trabaja en modo lectura.
- DeepSeek se usa como reviewer independiente del diff.
- Solo el implementador activo puede escribir en los archivos declarados en el
  alcance.
- Durante una revisión el diff queda congelado; si cambia, debe revisarse otra
  vez.
- No se permiten ediciones simultáneas de los mismos archivos por varios
  agentes.
- Las skills encapsulan procedimientos; no reemplazan la revisión humana.

Flujo completo: `docs/runbooks/ai-assisted-development.md`.

## Definición de terminado

- alcance implementado;
- spec aprobada en `docs/specs/` cuando el tipo de cambio la requiera;
- lint, tipos, pruebas y build ejecutados según el riesgo;
- revisión de seguridad/datos cuando aplique;
- documentación oficial actualizada;
- riesgos o deuda restante registrados;
- aprobación humana para commits, despliegues y cambios críticos.
