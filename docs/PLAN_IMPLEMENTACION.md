---
title: Plan de implementación del entorno de mantenimiento
status: active
owner: mantenimiento
last_reviewed: 2026-06-25
---

# Plan de implementación del entorno de mantenimiento de AgroGest VSM

## 1. Objetivo

Construir un entorno de trabajo seguro y sostenible para que un único
desarrollador pueda mantener y evolucionar AgroGest VSM con asistencia de IA,
sin depender de un proveedor concreto.

El sistema de trabajo debe:

- conservar el conocimiento técnico dentro del repositorio;
- reducir errores en cambios de base de datos, sincronización y seguridad;
- permitir usar Codex, OpenCode, DeepSeek y futuros modelos como Claude;
- mantener una única fuente documental de verdad;
- automatizar verificaciones sin crear una infraestructura difícil de mantener;
- crecer de forma gradual, basada en necesidades comprobadas.

## 2. Decisiones adoptadas

### 2.1 Organización de IA

La configuración inicial será deliberadamente pequeña:

```text
Desarrollador
└── Codex: orquestador e implementador principal
    ├── Explorador: investigación rápida y de solo lectura
    ├── DeepSeek Reviewer: segunda revisión independiente
    └── Skills: procedimientos especializados bajo demanda
```

No se crearán inicialmente agentes permanentes separados para backend, mobile,
admin web, QA, seguridad y base de datos. Se agregarán únicamente cuando exista
evidencia de que una tarea repetitiva mejora al aislarla.

### 2.2 Portabilidad

La fuente de verdad será independiente de la herramienta:

- `AGENTS.md`: instrucciones operativas para cualquier IA;
- `docs/`: documentación oficial y vault de Obsidian;
- `package.json`: comandos ejecutables;
- `.env.example`: contrato de configuración;
- código, pruebas y migraciones: comportamiento verificable.

Las carpetas específicas de Codex, OpenCode, Claude u otras herramientas serán
adaptadores. No contendrán conocimiento exclusivo imprescindible.

### 2.3 Documentación y Obsidian

`docs/` será el vault de Obsidian y la documentación versionada en Git.
OpenGem deberá leer y actualizar esa misma carpeta. No se mantendrá un vault
paralelo.

Cada categoría tendrá una responsabilidad única:

| Información                   | Fuente oficial       |
| ----------------------------- | -------------------- |
| Entrada para IA               | `AGENTS.md`          |
| Navegación documental         | `docs/index.md`      |
| Arquitectura vigente          | `docs/architecture/` |
| Modelo y reglas del dominio   | `docs/domain/`       |
| Decisiones históricas         | `docs/adr/`          |
| Cambios críticos planificados | `docs/specs/`        |
| Procedimientos operativos     | `docs/runbooks/`     |
| Entornos, riesgos y monitoreo | `docs/operations/`   |
| Notas temporales              | `docs/notes/`        |

Las notas temporales no son documentación oficial hasta ser promovidas a la
categoría correspondiente.

### 2.4 Especificaciones selectivas

No todos los cambios requieren una spec completa:

- cambio trivial: descripción clara y pruebas proporcionales;
- bug o feature de un módulo: ficha corta o issue;
- DB, sync, seguridad, geodatos, contrato API o varias apps: spec completa;
- decisión arquitectónica: ADR aprobado.

### 2.5 Regla de finalización

Un cambio no está terminado hasta:

1. implementar el alcance aprobado;
2. ejecutar validaciones proporcionales;
3. revisar seguridad y datos cuando corresponda;
4. actualizar la documentación oficial afectada;
5. registrar riesgos o trabajo pendiente explícitamente.

## 3. Estrategia de modelos

### Codex

- análisis integral;
- planificación;
- implementación;
- refactorización;
- depuración;
- coordinación API, mobile y web;
- validación final.

### DeepSeek API

- revisión independiente del diff;
- análisis de casos límite;
- revisión SQL, seguridad y rendimiento;
- propuesta de pruebas;
- segunda opinión sobre decisiones complejas.

DeepSeek no modificará simultáneamente los mismos archivos que Codex.

### Modelos gratuitos de OpenCode

- exploración;
- búsqueda;
- resúmenes;
- clasificación de incidencias;
- borradores documentales;
- tareas mecánicas de bajo riesgo.

No serán responsables finales de migraciones, autenticación, sincronización ni
operaciones de producción.

### Claude futuro

Podrá sustituir o complementar al implementador o reviewer sin cambiar la
documentación canónica ni el proceso.

## 4. Fases y ponderación

| Fase                     | Resultado                                                         |     Peso |
| ------------------------ | ----------------------------------------------------------------- | -------: |
| 0. Fundación portable    | Contexto, documentación única y gobierno documental               |      15% |
| 1. Seguridad operativa   | Base reproducible, backups, entornos, rollback y riesgos críticos |      20% |
| 2. Flujo asistido por IA | Codex + explorador + DeepSeek Reviewer                            |      15% |
| 3. Skills del proyecto   | Procedimientos para API, sync, DB, seguridad y documentación      |      10% |
| 4. Calidad y CI/CD       | Tests estables, cobertura útil, E2E y validación documental       |      15% |
| 5. Observabilidad        | Errores, logs, métricas, versión e incidentes                     |      15% |
| 6. Integraciones y DX    | OpenCode, OpenGem, MCP selectivos y comandos de trabajo           |      10% |
| **Total**                |                                                                   | **100%** |

La adopción y mejora del proceso son continuas después de completar estas fases.

## 5. Fase 0: Fundación portable

### Objetivo

Dar contexto consistente al desarrollador y a cualquier IA, haciendo que
`docs/` sea el vault oficial de Obsidian y la única fuente documental.

### Entregables

- [x] `AGENTS.md` en la raíz.
- [x] `docs/index.md` como mapa oficial.
- [x] política de documentación y promoción de notas.
- [x] resumen de arquitectura actual.
- [x] descripción del modelo de dominio.
- [x] descripción del protocolo offline/sync.
- [x] glosario inicial.
- [x] estructura y plantilla de ADR.
- [x] estructura y plantilla de specs.
- [x] runbook de desarrollo local.
- [x] inventario inicial de entornos.
- [x] registro inicial de riesgos.
- [x] integración de documentos preexistentes en el índice.
- [x] exclusión de configuración local de Obsidian.
- [x] SDD y ubicación de specs documentados en `AGENTS.md`.
- [x] numeración incremental incorporada a specs.

### Criterios de aceptación

- Una IA nueva puede localizar arquitectura, comandos, riesgos y reglas desde
  `AGENTS.md` y `docs/index.md`.
- No existe otro vault oficial fuera de `docs/`.
- Cada documento tiene una categoría y autoridad clara.
- Los documentos existentes están enlazados desde el índice.
- Los cambios críticos exigen spec, validación y actualización documental.

### Preparación previa a la Fase 1

Por decisión del mantenedor, se adelantaron componentes mínimos de las fases 2
y 6 antes de iniciar seguridad operativa:

- [x] instalar OpenGem `0.7.5` en el proyecto;
- [x] configurar OpenGem con el vault `docs`;
- [x] generar y validar el grafo inicial del repositorio;
- [x] crear y validar el subagente `explorador`;
- [x] crear una spec pequeña real para probar numeración y flujo SDD;
- [x] activar Obsidian CLI y validar acceso de lectura al vault `docs`;
- [x] ejecutar y cerrar la Spec 002 después de aprobación humana.

Este adelanto no cambia la ponderación: las fases 2 y 6 solo aportarán avance
cuando cumplan todos sus criterios de salida.

## 6. Fase 1: Seguridad operativa

### Objetivo

Reducir el riesgo de mantener un sistema usado por una empresa.

### Trabajo

- [x] documentar y probar backup y restauración;
- [x] definir separación entre desarrollo, staging y producción;
- [x] definir permisos mínimos sobre bases y servicios;
- [x] eliminar dependencias de una base preexistente no reproducible;
- [x] crear y probar un esquema backend completo desde cero;
- [x] documentar rollback de API, web y mobile;
- [x] corregir la suite que impedía pasar `pnpm check`;
- [x] agregar rate limiting y protección de login;
- [x] revisar secretos, CORS y TLS;
- [x] definir proceso de incidencias y soporte a usuarios;
- [x] reconciliar documentación de despliegue con configuración real.

### Criterio de salida

El sistema puede crearse, verificarse y recuperarse mediante procedimientos
documentados y probados localmente sin Docker. La provisión cloud de staging se
mantiene como acción operativa registrada en riesgos.

## 7. Fase 2: Flujo asistido por IA

### Objetivo

Operar un flujo pequeño y medible antes de aumentar el número de agentes.

### Trabajo

- [x] configurar Codex como orquestador e implementador;
- [x] configurar un explorador de solo lectura en OpenCode;
- [x] configurar DeepSeek como reviewer;
- [x] definir plantilla de handoff para revisiones;
- [x] establecer permisos de lectura y escritura;
- [x] impedir ediciones paralelas sobre los mismos archivos;
- [x] implementar y cerrar la Spec 002 como prueba pequeña;
- [x] probar el flujo con una tarea crítica;
- [x] medir tiempo, correcciones, consumo y defectos encontrados.

### Flujo estándar

1. El desarrollador plantea el problema.
2. Codex analiza y propone alcance.
3. El desarrollador aprueba cambios críticos.
4. Codex implementa y verifica.
5. DeepSeek revisa el diff sin editarlo.
6. Codex evalúa y corrige hallazgos válidos.
7. El desarrollador valida funcionalmente y autoriza el commit.

### Criterio de salida

Codex, explorador y DeepSeek tienen responsabilidades y permisos verificables.
El reviewer puede ejecutarse sin editar el repositorio, existe un handoff
portable y el flujo fue medido sobre la Spec 003. El resultado del piloto quedó
registrado en `docs/operations/ai-workflow-metrics.md`.

## 8. Fase 3: Skills del proyecto

### Objetivo

Encapsular procedimientos repetibles sin crear agentes permanentes innecesarios.

### Skills previstas

- [ ] `agrogest-documentation`: impacto documental y actualización del vault;
- [ ] `agrogest-api-module`: módulos, DTO, Swagger, permisos y pruebas;
- [ ] `agrogest-mobile-sync`: SQLite, outbox, dependencias y reconciliación;
- [ ] `agrogest-database-change`: migración, rollback y compatibilidad;
- [ ] `agrogest-security-review`: auth, roles, secretos y exposición;
- [ ] `agrogest-release-check`: validación y preparación de despliegue.

Las skills deben usar rutas y comandos canónicos del repositorio. No deben
depender de un modelo específico.

## 9. Fase 4: Calidad y CI/CD

### Objetivo

Hacer que la calidad sea verificable y no dependa solo de revisión manual.

### Trabajo

- [ ] estabilizar `pnpm check`;
- [ ] ejecutar build de aplicaciones en CI;
- [ ] agregar cobertura con umbrales graduales;
- [ ] ejecutar E2E críticos del panel;
- [ ] agregar pruebas de integración de API;
- [ ] validar enlaces y metadatos documentales;
- [ ] comprobar que specs implementadas actualizaron documentación vigente;
- [ ] proteger ramas utilizadas realmente por el repositorio;
- [ ] definir checklist de release.

No se aplicará cobertura alta indiscriminada. Se priorizarán auth, sync,
migraciones, geodatos y reglas de negocio.

## 10. Fase 5: Observabilidad

### Objetivo

Detectar, diagnosticar y comunicar fallos del sistema en uso real.

### Trabajo

- [ ] integrar seguimiento de errores en API, web y mobile;
- [ ] estructurar logs de la API;
- [ ] evitar datos sensibles en logs;
- [ ] registrar versión desplegada;
- [ ] mejorar health checks;
- [ ] observar errores y tiempos de sincronización;
- [ ] definir alertas mínimas;
- [ ] crear runbook de incidentes;
- [ ] establecer retención y acceso a telemetría.

## 11. Fase 6: Integraciones y experiencia de desarrollo

### Objetivo

Agregar herramientas que reduzcan trabajo real sin convertirlas en nuevas
fuentes de verdad.

### Trabajo

- [x] registrar `docs/` como vault y activar Obsidian CLI;
- [x] instalar y configurar OpenGem para operar sobre `docs/`;
- [x] generar el grafo inicial respetando `.opengemignore`;
- [ ] configurar OpenCode con proveedores por perfiles;
- [ ] activar MCP únicamente por tarea;
- [ ] usar PostgreSQL MCP inicialmente en modo lectura y nunca contra producción;
- [ ] evaluar GitHub MCP por su coste de contexto;
- [ ] añadir comandos portables a `package.json`;
- [ ] añadir scripts PowerShell solo donde aporten valor en Windows;
- [ ] documentar instalación y recuperación del entorno de IA.

## 12. Gobierno de agentes

Un nuevo subagente solo se añade si:

1. existe una tarea repetida al menos varias veces;
2. requiere contexto y permisos claramente aislables;
3. mejora calidad, tiempo o coste medido;
4. tiene una responsabilidad que no duplica otra;
5. puede verificarse mediante una salida concreta.

Los primeros candidatos, si resultan necesarios, son:

- auditor de DB y sincronización, de solo lectura;
- reviewer de seguridad, de solo lectura;
- explorador documental.

## 13. Uso de MCP

Los MCP agregan herramientas y también contexto. Por defecto estarán
deshabilitados, salvo los imprescindibles para la tarea actual.

Reglas:

- no conectar producción para exploración ordinaria;
- usar credenciales de mínimo privilegio;
- preferir lectura;
- no almacenar secretos en configuración versionada;
- documentar propósito y propietario de cada servidor;
- retirar servidores que no demuestren uso.

## 14. Seguimiento del avance

El porcentaje se calcula por fases terminadas según su peso, no por cantidad de
archivos creados. Una fase solo cuenta cuando cumple sus criterios de salida.

Estado al 25 de junio de 2026:

| Fase                     | Estado     | Avance aportado |
| ------------------------ | ---------- | --------------: |
| 0. Fundación portable    | completada |             15% |
| 1. Seguridad operativa   | completada |             20% |
| 2. Flujo asistido por IA | completada |             15% |
| 3. Skills                | pendiente  |              0% |
| 4. Calidad y CI/CD       | pendiente  |              0% |
| 5. Observabilidad        | pendiente  |              0% |
| 6. Integraciones y DX    | pendiente  |              0% |
| **Avance total**         |            |         **50%** |

Hay trabajo adelantado en la Fase 6, pero todavía no cumple sus criterios de
salida. Las fases 0, 1 y 2 aportan un avance consolidado de 50%.

## 15. Principios finales

- La IA propone y ejecuta; el desarrollador conserva responsabilidad y decisión.
- La documentación oficial cambia junto con el código.
- Código y automatizaciones verificables prevalecen sobre descripciones
  desactualizadas.
- Obsidian es la interfaz de conocimiento; Git conserva la historia.
- OpenGem ayuda a mantener el vault, pero no crea una memoria paralela.
- Pocos agentes con skills específicas son preferibles a muchos roles
  permanentes.
- La seguridad operativa tiene prioridad sobre ampliar la automatización.
- El proceso se ajustará con métricas y experiencia real.
