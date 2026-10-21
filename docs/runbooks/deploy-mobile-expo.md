---
title: Deploy mobile Android e iOS con Expo EAS
status: active
owner: mantenimiento
last_reviewed: 2026-10-19
---

# Deploy mobile Android e iOS con Expo EAS

La app mobile esta vinculada al proyecto Expo:

```text
@diegosv/agrogest-vsm-mobile-pilot
```

El perfil `production-apk` genera un APK instalable para el piloto y lo conecta
al canal OTA `production`.

La app ejecuta un `postinstall` para compilar los paquetes compartidos
`@agrogest/utils` y `@agrogest/validation` antes del bundle remoto de EAS.
El archivo `.easignore` de la raíz del monorepo conserva las exclusiones de
`.gitignore` y excluye artefactos temporales, configuración de agentes y material
de firma. EAS reemplaza las reglas de `.gitignore` cuando existe ese archivo;
mantenerlo actualizado antes de subir un build. El `.easignore` dentro de
`apps/mobile` no sustituye las reglas de la raíz del repositorio.

### Fallo de carga `ECONNRESET`

`Failed to upload the project tarball` con `read/write ECONNRESET` ocurre durante
la transferencia a Google Cloud Storage, antes de la compilación remota. El
100 % del contador representa bytes leídos/enviados por el cliente, no una
confirmación de almacenamiento del servidor. No requiere cambiar bundle ID,
certificados ni limpiar datos del teléfono.

El archivo raíz excluye `/.git`: EAS CLI 24.7 conserva por defecto una copia
superficial del repositorio en el archivo de subida; sus objetos duplicaban
aproximadamente 21 MiB de recursos en la inspección del 2026-10-19. El código
mobile, sus imágenes, paquetes compartidos y lockfile deben permanecer en el
archivo. Esta exclusión no modifica el repositorio de trabajo.
La regla se escribe sin barra final porque EAS CLI comprueba literalmente
`.git` para retirar también la copia creada por `git clone`.

En el reintento de esa fecha, la transferencia bajó de 43,7 MB a 22,2 MB y EAS
confirmó la carga completa en 41 segundos. El
[build iOS Ad Hoc 1049f96c](https://expo.dev/accounts/diegosv/projects/agrogest-vsm-mobile-pilot/builds/1049f96c-c371-42a0-b6af-d44094e875d3)
terminó en `FINISHED` con IPA para dispositivo físico, perfil `ios-internal`,
versión 0.2.4 (1) y runtime 0.2.4. Esto verifica la recuperación de esa carga
y la compilación firmada, sin atribuir el corte original a una causa de red
específica que el mensaje `ECONNRESET` no identifica. Ese IPA incorpora las
correcciones de arranque SQLite y PNG, pero su perfil inicial solo incluía un
iPhone. Para los dos dispositivos registrados usar el artefacto refirmado
`12c85152-e472-48b8-8ecd-42af990bb037`, documentado más abajo.

Desde `apps/mobile`, reintentar la compilación iPhone con una sesión de carga
nueva:

```powershell
$env:EXPO_NO_DOTENV = '1'
eas build --platform ios --profile ios-internal
```

Si vuelve a fallar, comprobar el [estado de Expo](https://status.expo.dev/) y
probar otra conexión estable. Una respuesta HTTP de Google Storage demuestra
conectividad, pero no garantiza que termine una subida grande. No reutilizar
ni versionar la URL firmada del error: contiene autorización temporal de carga.
No desactivar validación TLS para resolverlo. `--clear-cache` afecta a la
compilación remota y no corrige un corte durante esta transferencia.

Para inspeccionar qué se enviará sin crear un build remoto, usar una carpeta
de salida nueva y temporal, fuera del archivo de subida:

```powershell
eas build:inspect --platform ios --stage archive --profile ios-internal --output ../../tmp/inspeccion-ios
```

Referencias: [archivo de EAS](https://github.com/expo/fyi/blob/main/eas-build-archive.md)
y [reglas de exclusión](https://docs.expo.dev/build-reference/easignore/).

## Generar el primer APK

Desde `apps/mobile`:

```bash
npx eas-cli@latest build --platform android --profile production-apk
```

Al finalizar, Expo entrega un enlace para descargar e instalar el APK en los
telefonos Android.

## Preparación y compilación iOS

La spec 113 habilita iPhone con `ios.bundleIdentifier` igual a
`com.diegoasantos.agrogestvsm`, `buildNumber` inicial `1` y runtime `0.2.4`.
Conserva Android con el mismo package y `versionCode` 21, retenido al integrar
la rama remota para evitar retroceder desde builds Android existentes. Esta configuración
nativa exige un build nuevo; no publicar como OTA para el runtime `0.2.3`.
El build nativo de simulador verificado el 2026-10-19 declara iOS mínimo 15.1
en su Info.plist; versiones anteriores de iOS quedan fuera de este target.

Perfiles en `apps/mobile/eas.json`, todos sobre canal y entorno `production`:

| Perfil | Artefacto y destino | Firma Apple |
| --- | --- | --- |
| `ios-simulator` | `.app` empaquetada para simulador de Xcode en macOS | No requiere Apple Developer |
| `ios-internal` | IPA ad hoc para iPhones registrados | Requiere Apple Developer, certificado y UDID incluidos |
| `ios-production` | IPA para App Store Connect/TestFlight | Requiere Apple Developer y aprovisionamiento de tienda |

El mantenedor eligió distribución Ad Hoc y completó la firma del build
`0fa109d0-608d-4cad-a461-dd4624fbbe83`, versión 0.2.4 (1), instalado en el primer
iPhone el 2026-10-19. El mantenedor confirma la recuperación del arranque tras
la OTA de la spec 112 y del envío PNG tras su OTA correctiva (R-061 mitigado).
La versión de simulador no es instalable
en un iPhone. Windows permite preparar el bundle y solicitar builds EAS; para
ejecutar el simulador se necesita macOS con Xcode. No se crean ni publican
credenciales Apple desde el repositorio.

Desde `apps/mobile`, sin Apple Developer:

```bash
eas build --platform ios --profile ios-simulator
```

Con Apple Developer, seleccionar una ruta:

```bash
# Instalación interna: registrar primero cada iPhone y luego compilar.
eas device:create
eas build --platform ios --profile ios-internal

# TestFlight/App Store: compilar; el envío es una acción separada autorizada.
eas build --platform ios --profile ios-production
```

EAS configura certificados y perfiles durante el build de dispositivo. No
responder automáticamente que el cifrado es exento: revisar las dependencias
criptográficas y la declaración de exportación antes de enviar a Apple. Para
cada entrega posterior incrementar `ios.buildNumber`, conservando identificador
y equipo de firma. No cambiar identificadores para resolver un problema de
credenciales ni desinstalar una app con datos pendientes.

### Agregar nuevos iPhone e instalar AgroGest por Ad Hoc

Este es el procedimiento vigente para el segundo iPhone y los siguientes.
Se usa el proyecto Expo `@diegosv/agrogest-vsm-mobile-pilot`, bundle ID
`com.diegoasantos.agrogestvsm` y perfil `ios-internal`. La empresa ya tiene
Apple Developer. No hace falta crear otra app en App Store Connect ni publicarla
en App Store para esta distribución.

Registrar un iPhone y autorizarlo en un IPA son pasos distintos: el perfil de
firma del instalador debe incluir su UDID. Una OTA no agrega esa autorización.
Ver [distribución interna de EAS](https://docs.expo.dev/build/internal-distribution/).

#### 1. Preparar la terminal del mantenedor

Abrir PowerShell en `apps/mobile` y ejecutar:

```powershell
$env:EXPO_NO_DOTENV='1'
eas whoami
```

Si falta sesión Expo, usar `eas login` con la cuenta que tiene acceso al proyecto.
La cuenta Expo y el Apple ID son accesos diferentes. Cuando EAS pida iniciar
sesión en Apple, usar el Apple ID del equipo que firmó AgroGest y completar su
verificación en dos pasos. No usar el número Apple ID de la ficha de App Store
Connect como credencial. Conservar el mismo equipo Apple y bundle ID.

#### 2. Registrar cada iPhone nuevo

En esa terminal:

```powershell
eas device:create
```

Seleccionar el equipo Apple correcto y el método Website para obtener URL/QR.
El usuario debe abrir ese enlace en Safari **desde el iPhone que instalará la
app**, descargar el perfil e instalarlo desde Ajustes → Perfil descargado
(o General → VPN y gestión de dispositivos). Introducir el código del propio
iPhone y completar el regreso al navegador hasta ver el registro exitoso.

Este perfil sirve para recoger el UDID; todavía no instala AgroGest. Repetir
el registro para cada teléfono nuevo y confirmar después:

```powershell
eas device:list
```

Revisar equipo y UDID. `Name: Unknown` no invalida el registro. No confundir
UDID con IMEI o número de serie ni copiar identificadores reales al repositorio.
Los pasos de registro y perfil se describen en la
[guía de dispositivos de Expo](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/#provisioning-profile).

#### 3. Generar el IPA con todos los iPhone autorizados

Para la próxima incorporación se recomienda **compilar desde el código
corregido**: el IPA inicial `0fa109d0-608d-4cad-a461-dd4624fbbe83` contiene el
JavaScript anterior a las correcciones de arranque y PNG, aunque el teléfono
actual ya funciona al aplicar sus OTA. Refirmar aquel IPA no incorpora esas
correcciones al bundle embebido y puede volver a bloquear el primer inicio de
una instalación nueva antes de descargar la OTA.

Antes de compilar, validar el cambio y aumentar `expo.ios.buildNumber` en
`apps/mobile/app.json` a un valor mayor que el último build generado; por
ejemplo, de `"1"` a `"2"` si 1 sigue siendo el último. El perfil usa versiones
locales, sin incremento automático configurado. Si solo se incorporan las
correcciones JavaScript actuales, conservar `expo.version` y runtime `0.2.4`.
Una dependencia o configuración nativa nueva exige revisar el runtime.

Desde `apps/mobile`:

```powershell
$env:EXPO_NO_DOTENV='1'
eas build --platform ios --profile ios-internal
```

Cuando EAS solicite credenciales y dispositivos:

1. Autenticar el mismo equipo Apple y reutilizar su certificado de distribución
   válido. No revocar credenciales vigentes de otros builds.
2. Actualizar el perfil de aprovisionamiento Ad Hoc para incluir los dispositivos
   nuevos; no aceptar un perfil anterior sin esos UDID.
3. En la lista, marcar con Espacio todos los iPhone que deban instalar ese IPA,
   incluidos los anteriores, y confirmar con Enter.
4. Esperar estado `FINISHED`; revisar perfil `ios-internal`, plataforma iOS,
   destino de dispositivo físico, versión, build y canal `production`.

Usar el flujo interactivo para esta incorporación: un build con
`--non-interactive` puede reutilizar un perfil válido sin actualizar sus
dispositivos. La automatización con refresco de perfil exige configuración
adicional de credenciales y no es el flujo actual del piloto.
[Referencia EAS](https://docs.expo.dev/build/internal-distribution/#automation-on-ci-optional).

No se genera una app distinta por persona: un mismo IPA sirve para todos los
iPhone incluidos en su perfil. Si ahora son dos, registrar esos dos; los demás
se incorporan cuando existan. No hay que reservar diez plazas ficticias.

#### 4. Compartir el enlace de instalación

Abrir el build terminado en Expo y usar **Install** para obtener su enlace o
QR de instalación. Enviarlo al usuario; abrirlo en Safari en el iPhone
autorizado, pulsar Install y confirmar el aviso de iOS. La instalación termina
en la pantalla de inicio. Ver la
[guía de instalación EAS](https://docs.expo.dev/tutorial/eas/internal-distribution-builds/#install).

Este es otro enlace: el QR del paso 2 registra el teléfono; el QR de Install
instala la app. No enviar solamente el archivo `.ipa` por chat para abrirlo en
Archivos: puede aparecer como ZIP o vista previa sin instalarse. Compartir la
página de instalación, no un enlace directo al archivo descargado.

En iOS 16 o posterior, si se solicita, ir a Ajustes → Privacidad y seguridad →
Modo desarrollador, activarlo, reiniciar y confirmar la activación al desbloquear.
Si el ajuste no aparece, intentar abrir la app instalada y consultar la
[guía de Modo desarrollador](https://docs.expo.dev/guides/ios-developer-mode/).
Este requisito corresponde a la distribución Ad Hoc elegida.

Si el iPhone ya tiene AgroGest, instalar encima con la misma identidad y firma;
no desinstalar ni borrar datos para resolver un error. Los teléfonos que ya
funcionan no necesitan reinstalar solo porque se añadió otro al perfil.

#### 5. Verificar la entrega

Comprobar primer arranque y segundo arranque, login, captura offline, reinicio,
recuperación de pendientes y envío de receta como PDF y PNG. Con Internet y
modo automático/online, verificar también el aviso de actualización en Inicio.
La distribución se amplía después de este smoke.

Registrar fecha, ID del build, versión/buildNumber, runtime, equipo, cantidad de
dispositivos autorizados y resultado. Guardar UDID y destinatarios solo en el
registro operativo privado, no en Git. Revisar vigencia del certificado,
perfil y membresía antes de nuevas entregas.

#### Alternativa posterior: refirmar un IPA validado

Cuando ya exista un IPA con las correcciones embebidas y solo cambien los
iPhone autorizados, registrar primero los nuevos dispositivos y ejecutar:

```powershell
$env:EXPO_NO_DOTENV='1'
eas build:resign --platform ios --source-profile ios-internal --target-profile ios-internal
```

Elegir el build validado, autenticar el mismo equipo y actualizar el perfil
incluyendo todos los teléfonos requeridos. Esperar el resultado y compartir
**el enlace del nuevo artefacto refirmado**. El enlace anterior conserva su
perfil anterior; no autoriza por sí solo al teléfono recién registrado.

Refirmar actualiza firma/aprovisionamiento, sin recompilar JavaScript ni incluir
el código local o las OTA en el bundle embebido. No exige aumentar buildNumber
por sí solo; un build nuevo con cambios sí sigue el incremento descrito arriba.
Las OTA compatibles siguen llegando por canal y runtime, pero no sustituyen el
registro y la firma de un dispositivo nuevo.
[Referencia de refirmado EAS](https://docs.expo.dev/app-signing/app-credentials/#re-signing-new-credentials).

#### Comprobar el perfil ante un error de integridad

El mensaje de iOS «no se pudo verificar su integridad» puede aparecer si el
dispositivo no está incluido en el perfil que lleva el IPA, aunque figure en
`eas device:list`. Un build `FINISHED` no demuestra por sí solo que todos los
iPhone registrados estén autorizados por su firma.

El 2026-10-19 se compararon los dispositivos de EAS con `ProvisionedDevices`
del `embedded.mobileprovision` dentro del IPA `1049f96c`: había dos dispositivos
habilitados en EAS y solo uno en el archivo firmado. El perfil no estaba vencido
y el identificador de la app era correcto. La reutilización del perfil en modo
no interactivo había omitido el segundo dispositivo.

Se autenticó el mismo equipo Apple, se reutilizó el certificado vigente y se
actualizó el perfil seleccionando **ambos dispositivos**. El
[IPA refirmado 12c85152](https://expo.dev/accounts/diegosv/projects/agrogest-vsm-mobile-pilot/builds/12c85152-e472-48b8-8ecd-42af990bb037)
terminó en `FINISHED`, perfil `ios-internal`, versión 0.2.4 (1), runtime 0.2.4 y
destino físico. La inspección del nuevo IPA confirmó:

- dos dispositivos en `ProvisionedDevices` y coincidencia con los dos de EAS;
- perfil vigente e identidad `com.diegoasantos.agrogestvsm` conservada;
- mismo hash SHA-256 de `main.jsbundle` que el IPA de origen.

Compartir **el enlace nuevo** y abrirlo en Safari. El enlace del IPA anterior
sigue entregando su archivo anterior con un solo dispositivo autorizado.
Los UDID y los archivos usados para verificar el perfil son temporales y no
se guardan en Git. La comprobación del perfil no sustituye la prueba de
instalación y arranque en cada iPhone.

Para futuros registros, conservar el flujo interactivo descrito arriba y
verificar la lista final de `Provisioned devices`. En automatización, el
refresco explícito con `--refresh-ad-hoc-provisioning-profile` requiere las
credenciales API de Apple indicadas en la
[documentación EAS](https://docs.expo.dev/build/internal-distribution/#automation-on-ci-optional);
`--non-interactive` por sí solo conserva el perfil existente.

#### Límites y problemas frecuentes

Apple permite hasta 100 iPhone por año de membresía dentro de esa familia de
producto; desactivar uno no libera el cupo durante ese mismo año. El límite
corresponde a la cuenta, no a diez usuarios configurados en AgroGest.
[Referencia Apple](https://developer.apple.com/help/account/devices/devices-overview/).

| Síntoma | Acción |
| --- | --- |
| Solo se instaló un perfil | Completar el registro y luego usar el enlace Install del IPA. |
| IPA aparece como ZIP o vista previa | Abrir en Safari la página de instalación EAS. |
| No permite instalar en el iPhone nuevo | Revisar UDID, equipo y perfil incluido en ese IPA; registrar en EAS no basta. |
| No se pudo verificar la integridad del IPA | Comparar el perfil incluido con los dispositivos de EAS; refirmar con la selección completa y compartir el enlace nuevo. |
| Apple todavía procesa el alta del dispositivo | Esperar la habilitación de Apple y repetir build/refirmado; EAS documenta posibles demoras de 24–72 horas en membresías nuevas o renovadas. |
| Solicita Modo desarrollador | Activarlo, reiniciar y confirmar, según el paso 4. |
| Abre y se cierra | Verificar que el build incluya la corrección SQLite 75; conservar evidencia y datos. |
| No recibe la OTA | Revisar Internet, modo automático/online, canal y runtime; aplicar Actualizar ahora en Inicio. |

La [gestión de dispositivos de EAS](https://docs.expo.dev/build/internal-distribution/#managing-devices)
explica el registro en Apple y sus posibles demoras.

### Permisos y conexión del piloto iOS

La configuración mantiene permisos de ubicación en uso, cámara y galería,
y describe en español el acceso al servidor LAN. No habilita ubicación en
segundo plano, micrófono ni Face ID. Los mapas usan Apple Maps con el proveedor
predeterminado de `react-native-maps`; la clave Maps de Android no se usa en iOS.

Por decisión explícita del usuario se conserva HTTP para el piloto, tanto
API pública como fallback LAN. `NSAppTransportSecurity.NSAllowsArbitraryLoads`
permite HTTP de forma general en iOS: no restringe la excepción a un host ni
cifra tokens, datos o fotos (R-048 y R-059). No agregar
`NSAllowsLocalNetworking` junto a esa clave: iOS puede ignorar la excepción
general cuando existen excepciones específicas. Antes de un release amplio,
migrar los destinos realmente usados en `src/shared/services/api/config.ts`
a HTTPS y retirar la excepción; cambiar solo `EXPO_PUBLIC_API_URL` no cambia
los destinos fijos de producción. Revisar requisitos de Apple antes de enviar.

### Validación iOS

Desde la raíz, en PowerShell, sin cargar `.env`:

```powershell
$env:EXPO_NO_DOTENV='1'
pnpm --filter @agrogest/mobile exec expo config --type introspect
pnpm --filter @agrogest/mobile exec expo export --platform ios --output-dir ../../tmp/ios-compatibility-audit
```

La introspección comprueba plugins/Info.plist y la exportación comprueba bundle
JavaScript y assets; ninguna demuestra por sí sola compilación nativa o uso
real en iPhone. Usar nombres ASCII en rutas de assets: `aranita_roja.webp`
evita el fallo de resolución encontrado en EAS/macOS con `arañita_roja.webp`,
aunque el bundle local de Windows resolvía ese nombre.
Antes de distribuir un IPA, verificar en dispositivo con datos
sintéticos: inicio/login, permisos aceptados y denegados, mapa y GPS, fotos,
teclado/áreas seguras, PDF/impresión/compartir, captura offline, reinicio y sync
sin pérdida de pendientes; también acceso LAN y recuperación por red externa.
Cancelar la distribución ante bloqueos de inicio, red o pérdida de datos.

Fuentes: [simuladores EAS](https://docs.expo.dev/build-reference/simulators/),
[firma y roles Apple](https://docs.expo.dev/app-signing/apple-developer-program-roles-and-permissions/).

## Publicar una actualizacion OTA

Para cambios compatibles de TypeScript, pantallas, estilos o assets:

```bash
npx eas-cli@latest update --platform android --channel production --environment production --message "Describe el cambio"
```

La actualizacion se descarga al abrir la app y normalmente se aplica en el
siguiente reinicio.

### Recuperación del arranque iOS: spec 112

La corrección de la migración 75 conserva esquema final 78, runtime 0.2.4,
dependencias y firma. El usuario autorizó publicarla únicamente para iOS en
`production`. Desde `apps/mobile`, en PowerShell:

```powershell
$env:EXPO_NO_DOTENV='1'
eas update --platform ios --channel production --environment production --message "Corrige arranque SQLite en instalaciones nuevas (spec 112)" --non-interactive --json
```

Antes de publicar, comprobar pruebas SQLite reales, lint/tipos y export iOS.
Después, verificar en EAS plataforma, runtime, canal y grupo; registrar el ID en
la spec 112. No usar `--platform all` para esta entrega.

Entrega publicada el 2026-10-19: grupo
`3b04de86-dc68-4367-bc55-1285c2922983`, solo iOS/runtime 0.2.4 en production.
Las validaciones locales aprobaron 2141 pruebas; el mantenedor confirmó la
reapertura y el funcionamiento general en iPhone. Reportó un incidente separado
al generar PNG, mientras compartir PDF funciona.

En el iPhone mantener conexión a Internet, abrir la app y volver a abrirla tras
el cierre para permitir descargar y activar la corrección. La recuperación de
`expo-updates` puede descargar un bundle incluso tras un error JS temprano,
pero no garantiza recuperar todos los crashes. Si persiste, conservar el crash
report y revisar una entrega Ad Hoc nueva con el mismo bundle ID/equipo y
`ios.buildNumber` incrementado; instalar encima sin desinstalar ni borrar datos.
Verificar login, segunda apertura y pendientes antes de declarar recuperado.
No volver al bundle defectuoso como rollback: emitir corrección hacia adelante.

Fuente: [recuperación de errores de Expo](https://docs.expo.dev/eas-update/error-recovery/).

### Validación de imágenes de receta en iOS

El generador usa una WebView cubierta por el indicador de carga. Sus scripts
de medición y paginado deben continuar aunque WebKit suspenda
`requestAnimationFrame`: conservan los fotogramas normales y agregan una salida
por temporizador de 250 ms, sin emitir dos veces por esa salida. Se sigue
esperando a fuentes e imágenes antes de medir. El límite global de 60 segundos
y Cancelar permanecen; una terminación del proceso WebView informa error.

En iOS, `capture()` entrega los archivos después de `Modal.onDismiss`, para
evitar presentar el diálogo de compartir mientras se está cerrando el modal de
carga. Si el cierre no se confirma en cinco segundos, falla y libera los
temporales. Android conserva la entrega inmediata. No se modifican HTML de
receta, PDF, datos, MIME/UTI, librerías nativas ni runtime 0.2.4.

Antes de distribuir: pruebas de scripts con fotogramas normales y suspendidos,
paginado, assets y páginas vacías, tipos/lint y export iOS. Después comprobar
en iPhone una receta corta y otra de varias páginas, abrir el diálogo de
compartir, enviar PNG legible, cancelar y reintentar. El PDF sirve como
alternativa ante un nuevo fallo de imagen. Una exportación no acredita el resultado
en el dispositivo; registrar el grupo OTA y el resultado físico al entregarla.

Rollback: si la corrección PNG falla, emitir otra OTA iOS que restaure solo el
generador anterior y conserve la reparación SQLite 75 ya entregada. Mantener el
runtime 0.2.4 y usar PDF mientras se investiga. No borrar almacenamiento ni
retirar la OTA de arranque para volver a un bundle que bloquea bases nuevas.

Entrega PNG autorizada y publicada el 2026-10-19 a las 17:02:19 UTC
(12:02:19 Lima): grupo `76db3fdf-3603-489b-a3f1-ca04d19b91df`, update
`01a1551d-328f-73b3-97ac-94cb9706771b`, solo iOS, production, runtime 0.2.4.
EAS confirma plataforma, rama y runtime. Pruebas de reportes: 27 aprobadas,
incluidas siete nuevas de scripts ejecutados con fotogramas normales y
suspendidos; lint, tipos/build mobile, Prettier, documentos y export iOS
aprobados. Bundle de validación en `dist/ios-recipe-png-fix-0.2.4`. Sin nueva
dependencia nativa ni IPA. El usuario confirmó el 2026-10-19 que el envío PNG
ya funciona en iPhone después de cargar la OTA. R-061 queda mitigado; esta
confirmación no reemplaza el smoke de instalación en cada teléfono nuevo.

Fuentes: [WebKit y suspensión de fotogramas](https://webkit.org/blog/8970/how-web-content-can-affect-power-usage/)
y [Modal.onDismiss](https://reactnative.dev/docs/modal#ondismiss).

Para la recuperacion de visitas de la spec 081 no hay dependencia nativa ni
migracion SQLite, por lo que corresponde una OTA del runtime vigente. Antes de
publicarla, validar con una copia anonimizada que contenga mas de 300 elementos
de outbox. Tras aplicarla puede existir un unico aumento del contador por el
reencolado correctivo; luego cada intento debe informar resultado parcial y
reducir los pendientes hasta cero. No desinstalar ni limpiar almacenamiento.

Si se cancela esta recuperacion, publicar una correccion hacia adelante que
desactive el reencolado pero mantenga `PATCH` para updates. No republicar el
handler anterior mientras existan operaciones pendientes.

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

Si el release modifica conectividad efectiva, validar ademas una red limitada:
dos timeouts o fallos de transporte deben activar offline automatico sin perder
pendientes. Una respuesta HTTP lenta o 5xx debe conservar el modo online y
mostrar su error remoto; una cancelacion interna no debe degradar la calidad.
Tres sondeos con alcance deben restaurar online y, despues de cinco minutos sin
actividad, un historial anterior no debe forzar offline al reabrir. Confirmar
que offline manual sobrevive al reinicio, muestra su recordatorio y permite
login con conectividad fisica, pero no ejecuta sync, catalogos, clima remoto ni
OTA hasta volver a automatico.

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
EXPO_PUBLIC_API_URL=http://190.119.191.195:5177
EXPO_PUBLIC_PRODUCTOR_WEB_URL=https://panel.agrogest.example/productor/acreedores
```

Configurar `EXPO_PUBLIC_PRODUCTOR_WEB_URL` con la URL HTTPS real de la ruta
pública del mismo entorno. Es un enlace genérico; el código se comparte aparte
en el mensaje. Antes de distribuir Comercial con esta acción, verificar API,
migración 064 y web pública. No emitir códigos mientras la web no esté lista.

Cuando un OTA mobile consume campos aditivos nuevos de la API, desplegar y
verificar primero la API de produccion. En particular, para los resúmenes de
ET0 y radiacion solar se debe confirmar la respuesta de Open-Meteo y Davis antes
de publicar el update EAS. La app tolera temporalmente una API o cache anterior
mostrando `—`, pero el orden API → OTA evita una experiencia incompleta.
