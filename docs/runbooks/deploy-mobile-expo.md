---
title: Deploy mobile Android con Expo EAS
status: active
owner: mantenimiento
last_reviewed: 2026-08-02
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

## API de produccion

El entorno EAS `production` contiene:

```env
EXPO_PUBLIC_API_URL=https://agrogest-vsm-api.onrender.com
```
