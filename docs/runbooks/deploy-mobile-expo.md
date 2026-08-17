---
title: Deploy mobile Android con Expo EAS
status: active
owner: mantenimiento
last_reviewed: 2026-08-16
---

# Deploy mobile Android con Expo EAS

La app mobile esta vinculada al proyecto Expo:

```text
@diegosv/agrogest-vsm-mobile-pilot
```

El perfil `production-apk` genera un APK instalable para el piloto y lo conecta
al canal OTA `production`.

La app ejecuta un `postinstall` para compilar los paquetes compartidos
`@agrogest/utils` y `@agrogest/validation` antes del bundle remoto de EAS.

## Generar el primer APK

Desde `apps/mobile`:

```bash
npx eas-cli@latest build --platform android --profile production-apk
```

Al finalizar, Expo entrega un enlace para descargar e instalar el APK en los
telefonos Android.

## Publicar una actualizacion OTA

Para cambios compatibles de TypeScript, pantallas, estilos o assets:

```bash
npx eas-cli@latest update --platform android --channel production --environment production --message "Describe el cambio"
```

La actualizacion se descarga al abrir la app y normalmente se aplica en el
siguiente reinicio.

## Aviso de actualizacion dentro de la app

Inicio comprueba actualizaciones compatibles cuando obtiene el foco. La
comprobacion y la descarga son silenciosas: un fallo de red no bloquea Inicio
ni los flujos offline. Cuando la descarga termina, Inicio muestra el aviso
`Nueva version disponible` con el boton `Actualizar ahora`.

El boton recarga el bundle mediante `expo-updates`; no reinstala el APK, no
limpia SQLite y no modifica la outbox. La app no fuerza la recarga dentro de
formularios para evitar perder datos aun no guardados. Si el usuario ignora el
aviso o cierra la app, la actualizacion descargada queda lista para el siguiente
arranque.

La primera OTA que incorpora este mecanismo conserva el ciclo anterior: los
usuarios deben recibirla y arrancarla antes de que futuras actualizaciones
puedan mostrar el aviso en Inicio. Este flujo solo funciona en builds release
con canal, plataforma y `runtimeVersion` compatibles.

## Cuando generar otro APK

Genera y distribuye otro APK si cambias:

- Expo SDK
- dependencias con codigo nativo
- plugins de Expo
- permisos Android
- configuracion nativa

En esos casos incrementa `expo.version` en `apps/mobile/app.json` y vuelve a
ejecutar el comando de build.

No publiques esos cambios por OTA sobre un APK anterior con el mismo
`runtimeVersion`, porque el JavaScript puede intentar cargar modulos nativos que
ese binario no contiene y la app puede cerrarse al iniciar.

## Actualizacion in-place sin perder SQLite

La base local vive en el sandbox de Android y se conserva durante una
actualizacion instalada encima de la aplicacion existente. Para cada APK nuevo
son condiciones obligatorias:

- conservar `android.package` (`com.diegoasantos.agrogestvsm`);
- firmar con la misma credencial Android ya registrada en EAS;
- incrementar `android.versionCode`;
- no desinstalar, limpiar datos ni cambiar el nombre `agrogest-vsm.db`;
- ejecutar y probar solamente migraciones SQLite aditivas o explícitamente
  preservadoras.

`eas.json` selecciona el perfil de build, pero no contiene el keystore. Antes de
distribuir se debe confirmar en EAS que la credencial de Android sigue siendo la
misma. Si Android informa una firma incompatible, se cancela la instalacion: ni
`adb install -r` omite esa validacion ni se debe desinstalar como solucion,
porque la desinstalacion elimina el sandbox y la base local.

Para una dependencia nativa se incrementan juntos:

- `apps/mobile/package.json::version` como version del paquete;
- `apps/mobile/app.json::expo.version`, que tambien crea un nuevo runtime por la
  politica `runtimeVersion.policy = appVersion`;
- `apps/mobile/app.json::expo.android.versionCode` para Android.

Antes del reparto productivo, hacer una prueba de actualizacion representativa:

1. instalar el APK productivo anterior y crear datos sinteticos, incluidos
   pendientes de outbox;
2. registrar `PRAGMA user_version` y conteos no sensibles por tabla;
3. instalar el APK candidato encima, sin desinstalar;
4. abrir la app y comprobar migraciones, lectura de visitas, receta y outbox;
5. comparar conteos e invariantes y ejecutar un sync controlado;
6. cancelar el release ante cualquier perdida, inconsistencia o error de firma.

Para el salto `versionCode` 7 a 8 no se agrega una migracion SQLite. La cohorte
productiva debe estar en `user_version = 53`; una instalacion mucho mas antigua
requiere evaluar primero su ruta historica de migraciones y no debe recibir el
APK por supuesto.

La recuperacion de catalogos de receta de la spec 042 agrega la migracion
SQLite 60 desde JavaScript y no cambia dependencias, plugins ni permisos
nativos, por lo que es candidata a OTA sobre un runtime compatible. Antes de
publicarla se debe actualizar in-place una copia representativa que contenga
`sync_outbox`, `sync_failures` y filas de catalogo en `pending`/`error`;
cancelar si no llega a `user_version = 60` preservando esos datos.

## API de produccion

El entorno EAS `production` contiene:

```env
EXPO_PUBLIC_API_URL=https://agrogest-vsm-api.onrender.com
```

Cuando un OTA mobile consume campos aditivos nuevos de la API, desplegar y
verificar primero la API de produccion. En particular, para los resúmenes de
ET0 y radiacion solar se debe confirmar la respuesta de Open-Meteo y Davis antes
de publicar el update EAS. La app tolera temporalmente una API o cache anterior
mostrando `—`, pero el orden API → OTA evita una experiencia incompleta.
