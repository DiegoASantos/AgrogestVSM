---
title: Ajustes del Excel de visitas y preparación para iPhone
status: implemented
numero: 113
area: api, admin-web, mobile, reportes, release
created: 2026-10-19
approved_by: usuario mediante "apruebo la spec la firma la dejemos para despues", 2026-10-19
implemented_in: apps/api/src/modules/visitas-campo, apps/admin-web/src/modules/auth/presentation/login-form.tsx, apps/mobile/app.json, apps/mobile/eas.json, .easignore; 2026-10-19
---

# Spec 113: Ajustes del Excel de visitas y preparación para iPhone

## Contexto

Esta spec fue aprobada e implementada originalmente con el número 111. Al
integrar la rama remota el 2026-10-19, ese número ya correspondía a la spec de
pagos y previsualización; se renumeró a 113 conservando alcance, aprobación e
historial de la implementación. La reparación SQLite mantiene el número 112.

El usuario solicita corregir el login web, ajustar el Excel de visitas y preparar
la app para iPhone. Confirma que plantas corresponde a la visita de cada fila,
que se mantiene HTTP para el piloto y que todavía no tiene Apple Developer.
El instalable iOS es un IPA, no un APK. No se puede entregar un IPA firmado para
distribución a iPhones sin las credenciales y el aprovisionamiento de Apple.

## Alcance

### Incluido

- Texto `Contraseña` en login web (mobile ya lo tiene correcto).
- Ajustes en `GET /visitas-campo/reporte-excel`, con pruebas de lectura del XLSX.
- Habilitar iOS en Expo y configurar identificador, versión y permisos nativos.
- Perfiles EAS iOS para simulador, instalación interna y TestFlight/App Store.
- Validar configuración, bundle iOS, tipos, lint y pruebas pertinentes.
- Documentar compilación, firma, prueba en dispositivo y limitaciones pendientes.

### Excluido

- Migraciones, cambios de SQLite, outbox, sincronización o autenticación.
- Despliegue de API/web, publicación OTA o envío a App Store/TestFlight.
- Compra/registro de Apple Developer, creación de certificados o entrega de un
  IPA instalable sin firma. No se solicitan credenciales privadas en el chat.
- Modificar la infraestructura HTTP o emitir una nueva distribución Android.

## Requisitos

- RF-001: Cambiar `Contrasena` por `Contraseña` en el login web.
- RF-002: Eliminar `Estado` e insertar `Nro de plantas` inmediatamente después
  de `Nro de hectáreas`. Usar `visita.nroPlantas` de cada fila; conservar cero
  y dejar vacío cuando sea nulo. No consultar la última visita de la parcela.
- RF-003: Mantener hectáreas como número; usar formato `0` para enteros y
  `0.####` para fracciones. Conservar fuente actual: área de la parcela.
- RF-004: Edad en años completos entre fecha de siembra y fecha de visita,
  como número entero con formato `0`; menos de un año muestra cero. Fechas
  ausentes, inválidas o futuras dejan la celda vacía. Conservar la regla de
  aniversario vigente (29 de febrero cumple año el 1 de marzo en año no bisiesto).
- RF-005: Todos los valores de `Etapa o labor` en mayúsculas, conservando
  acentos y las equivalencias vigentes de nombres del reporte.
- RF-006: Mantener 22 columnas, títulos A:V, autofiltro y alineación de filas;
  desplazar índices de estilos y combinaciones por la inserción/eliminación.
- RF-007: Habilitar `android` e `ios`; identificador iOS
  `com.diegoasantos.agrogestvsm`, build inicial `1`, orientado a iPhone.
  Nueva versión app/runtime `0.2.4` y código Android `17`, preservando package
  y credenciales Android existentes. No publicar OTA sobre el runtime anterior.
- RF-008: Mantener plugins existentes de ubicación en uso, cámara, galería,
  SQLite y almacenamiento seguro; usar Apple Maps mediante proveedor nativo
  predeterminado en iOS. No agregar permisos de micrófono ni ubicación de fondo.
- RF-009: Mantener API HTTP pública y fallback LAN existentes. Configurar ATS
  para permitir HTTP en iOS y explicar permiso de red local en español.
  No cambiar selección de API, lógica de sync ni destinos de los datos.
- RF-010: Perfiles EAS `ios-simulator` (simulador, artefacto .app),
  `ios-internal` (IPA ad hoc, exige cuenta Apple y dispositivos registrados) y
  `ios-production` (IPA de tienda, exige cuenta Apple). Conservar perfil Android.
- RNF-001: No declarar compatibilidad real completa sin prueba en iPhone;
  distinguir bundle JavaScript, compilación nativa y validación física.
- RNF-002: Sin credenciales Apple, intentar validación y compilación de
  simulador cuando EAS esté disponible; no afirmar que .app sirve en iPhone.

## Contratos afectados

Ruta, filtros, permisos, MIME y nombre del Excel permanecen. La edad pasa de
texto con años/meses a número entero; L pasa a plantas, M a categoría, N/O a
horas, P/Q a etapa/porcentaje, R/S/T a diagnósticos, U/V a datos de riego.
Se elimina Estado. No hay cambios JSON ni del protocolo de sincronización.
Expo habilita iOS y crea un runtime nuevo por configuración nativa.

## Seguridad y datos

Conservar controles de rol/agronómo y protección contra fórmulas del Excel.
El usuario confirma mantener HTTP para el piloto. ATS con
`NSAllowsArbitraryLoads` permite conexiones HTTP de la app, no solo al servidor
actual: tokens, datos y fotos continúan expuestos en tránsito (riesgo R-048).
La configuración debe documentar esta amplitud, sin presentarla como cifrado ni
garantizar aprobación de App Store. Revisar y retirar la excepción al migrar a
HTTPS. No incorporar secretos ni datos reales en código, pruebas o logs.

## Migración y rollback

No hay migraciones. Revertir el generador restaura el Excel anterior sin tocar
datos. iOS requiere build nativo nuevo; no afecta instalaciones Android existentes.
Conservar identificador, firma y base local Android. Ante fallos iOS, detener
distribución y corregir hacia adelante; no desinstalar para resolver problemas
de datos. Mantener el runtime anterior para sus instalaciones hasta validar
una actualización nativa representativa.

## Criterios de aceptación

- [x] CA-001: Login web correcto y lint del archivo aprobado.
- [x] CA-002: XLSX con orden acordado, plantas por visita y sin Estado.
- [x] CA-003: Enteros sin punto, fracciones preservadas, edad entera y etapas
  mayúsculas; nulos, límites de fechas y filas múltiples cubiertos.
- [x] CA-004: Configuración Expo resuelta para iOS y bundle iOS generado.
- [x] CA-005: Perfiles de firma/distribución documentados y límites explícitos
  de lo verificable sin Apple Developer ni iPhone conectado.
- [x] CA-006: Tipos, lint, pruebas y builds proporcionales aprobados; riesgos
  y documentación vigente actualizados.

## Pruebas

- Unitarias de edad: aniversarios, menores de un año, bisiestos e inválidos.
- Leer XLSX generado: columnas, tipos, formatos, estilos, merges y protección.
- Expo config y export iOS sin cargar archivos `.env`; tipos y lint mobile.
- EAS simulador si el entorno y servicio lo permiten, sin publicación.
- Pendiente físico: login, permisos denegados/aceptados, mapa, fotos, teclado,
  PDF/compartir, captura offline, reinicio y sync con datos sintéticos.
- Para instalar IPA: cuenta Apple, firma y ruta de distribución por confirmar
  cuando el usuario disponga de Apple Developer.

### Evidencia de implementación (2026-10-19)

- `pnpm check`: aprobado; lint, tipos, 2135 pruebas en 285 archivos y
  validación documental.
- `pnpm build`: aprobado para API, panel, mobile y paquetes compartidos.
- Pruebas acotadas del generador y edad: 54 aprobadas, con lectura del XLSX.
- Expo introspect: permisos de cámara, galería y ubicación en uso; sin
  declaraciones de micrófono, Face ID ni ubicación permanente. ATS permite
  HTTP según la aceptación del piloto.
- Expo export iOS: 1858 módulos y 53 assets; bundle Hermes de 6.21 MB generado
  y conservado localmente en `dist/ios-compatibility-final` tras la corrección
  del nombre de imagen.
- `.easignore` en raíz: exclusión de `.env`, credenciales, temporales y
  configuración de agentes verificada con rutas sintéticas mediante el lector
  de reglas del propio EAS CLI, sin leer secretos. Preserva fuentes, lockfile,
  workspace y configuración necesarios para el build.
- [Build de simulador EAS](https://expo.dev/accounts/diegosv/projects/agrogest-vsm-mobile-pilot/builds/18673e8a-a3f1-4684-9954-7436ff4ed556)
  inicial: falló en bundle al resolver `arañita_roja.webp` en macOS. Se renombró
  el archivo a ASCII (`aranita_roja.webp`) y se actualizó su referencia; el hash
  Git del contenido se mantiene idéntico. Bundle iOS, lint y tipos mobile
  aprobados nuevamente tras la corrección. El doctor remoto también informa Expo
  54.0.36 frente al parche 54.0.37 disponible; no fue el motivo del fallo.
- [Segundo build de simulador EAS](https://expo.dev/accounts/diegosv/projects/agrogest-vsm-mobile-pilot/builds/18ba2488-1a59-4cda-88f0-108fdb12baf5):
  `FINISHED` el 2026-10-19, después de corregir el nombre del asset. Compilación
  nativa macOS/iOS aprobada sin firma Apple ni publicación.
- Artefacto descargado en `dist/agrogest-vsm-ios-simulator-0.2.4.tar.gz`
  (39,710,746 bytes). Info.plist de la `.app` compilada inspeccionado sin
  extraer/ejecutar: identificador correcto, versión 0.2.4, build 1, mínimo iOS
  15.1 y plataforma `iphonesimulator`; ATS y permisos coinciden con la spec.
- Firma Apple, instalación en iPhone y smoke físico diferidos expresamente.

## Impacto documental

- [ ] Arquitectura.
- [x] Dominio: actualizar contrato del Excel en `docs/domain/data-model.md`.
- [x] Runbook: ampliar `docs/runbooks/deploy-mobile-expo.md` para iOS.
- [ ] ADR.
- [x] Variables o despliegue: entornos, seguridad HTTP y riesgos de iOS.
