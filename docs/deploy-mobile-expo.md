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

## API de produccion

El entorno EAS `production` contiene:

```env
EXPO_PUBLIC_API_URL=https://agrogest-vsm-api.onrender.com
```
