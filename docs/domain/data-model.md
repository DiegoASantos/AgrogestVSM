---
title: Modelo del dominio
status: active
owner: mantenimiento
last_reviewed: 2026-07-03
---

# Modelo del dominio

## Núcleo territorial

```text
Departamento → Provincia → Distrito → Sector
                                      │
Productor ────────────────────────────┼→ Parcela
                                      │
                                      └→ Visita de campo
```

Una parcela pertenece a un productor y a un sector. Puede tener punto de
referencia y geometría MultiPolygon. Un productor puede representar una
persona, un fundo o una cooperativa. Las personas requieren `nombres` y
`apellidos`; el tipo y numero de documento son opcionales y deben registrarse
juntos cuando se informan. Fundos y cooperativas usan `nombres` como nombre de
la entidad y no requieren documento.

Desde la spec 007, la relacion vigente es `Sector -> Subsector -> Parcela`.
`Parcela.sectorId` se conserva en respuestas de API como valor derivado para
compatibilidad temporal de mapas, visitas, historial, geodatos y reportes
mobile; la FK real es `subsectorId`.

Restricciones territoriales relevantes:

- nombre de subsector unico dentro del sector;

- código y nombre de departamento únicos;
- código de provincia único y nombre único dentro del departamento;
- ubigeo de distrito único y nombre único dentro de la provincia;
- nombre de sector único dentro del distrito;
- código de parcela autogenerado por la API con formato `PAR-###`; el
  correlativo es global y no se ingresa desde el flujo normal del admin web;
- nombre de parcela único por productor y subsector, validado por la API. La
  base de datos todavía no define constraint para esta regla;

## Producción agrícola

- [cultivo](cultivos.md);
- variedad asociada al cultivo;
- campaña;
- etapa fenológica;
- subetapa.

Estos catálogos contextualizan la parcela y cada visita. El cultivo es el
catálogo base de producción agrícola: desde él se resuelven variedades,
campañas, etapas fenológicas y nutrientes aplicables a una visita.

## Visita de campo

La visita es el agregado operativo principal. Contiene datos generales y
relaciona:

- parcela;
- cultivo, variedad y campaña;
- agrónomo;
- etapa y subetapa;
- fecha, horas, área y observación general;
- ubicación y firmas.

Entidades hijas:

- evaluaciones nutricionales;
- observaciones sanitarias y órganos afectados;
- notas y recomendaciones por paso;
- diagnóstico de riego;
- labores culturales;
- receta agronómica y sus secciones.
- calificaciones de cumplimiento técnico por módulo.

Las calificaciones de cumplimiento viven en `visita_calificaciones` y son hijas
de una visita. Cada visita puede tener una calificación por módulo:
`plagas`, `enfermedades`, `nutricion`, `riego` y `labores`. El puntaje técnico
usa escala 0-3 y se sincroniza desde mobile mediante outbox después de que la
visita padre tenga identificador de servidor.

La calificación solo es clasificable cuando existe una receta anterior para la
misma parcela. Por eso mobile exige registrar al menos una recomendación antes
de finalizar una receta nueva. Si una visita previa no tiene receta, la visita
siguiente muestra la referencia como no clasificable y no solicita score.

La API calcula el score de cumplimiento en escala 0-100. El score por módulo se
deriva de `puntaje / 3 * 100`; el score general de una visita usa la matriz de
pesos hardcodeada por nombre normalizado de etapa fenológica. Los agregados por
productor y por campaña se resuelven desde `campaniaId`.

## Seguridad

- usuario;
- rol;
- relación usuario-rol;
- sesión de refresh token.

Los roles actuales distinguen principalmente administración y trabajo técnico.

## Fuente estructural

Este documento explica relaciones conceptuales. Las columnas exactas y
restricciones se consultan en:

- entidades TypeORM de `apps/api/src/modules`;
- migraciones de `apps/api/src/database/migrations`;
- esquema y migraciones SQLite de `apps/mobile/src/shared/database`.

El esquema inicial puede reproducirse desde entidades TypeORM mediante el
bootstrap protegido. Las migraciones conservan ajustes y semillas históricas.
