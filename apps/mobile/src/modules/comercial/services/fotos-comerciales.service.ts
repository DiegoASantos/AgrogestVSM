import { gcm } from "@noble/ciphers/aes";
import { bytesToHex, hexToBytes } from "@noble/ciphers/utils";
import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { ImagePickerAsset } from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { getCatalogSessionUserId } from "../../../shared/database/catalog-session";
import { getDatabase } from "../../../shared/database/connection";
import { ApiRequestAbortedError } from "../../../shared/services/api/errors";
import { insertSyncOutboxEntry } from "../../../shared/database/sync-outbox";
import { deleteSyncFailureForEntity } from "../../../shared/database/sync-failures";
import { getNowIsoString } from "../../../shared/database/sqlite-utils";
import { generateLocalId, generatePublicId } from "../../../shared/utils/local-id";

const MAX_BYTES = 10 * 1024 * 1024;
const directory = new Directory(Paths.document, "commercial-photos");
const pendingKeys = new Map<string, Promise<Uint8Array>>();

export type FotoComercialLocal = {
  localId: string;
  publicId: string;
  productorId: string;
  fileName: string | null;
  sha256Original: string;
  sizeBytes: number;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  syncErrorMessage: string | null;
  createdAt: string;
};

type Row = {
  local_id: string;
  public_id: string;
  productor_id: string;
  file_name: string | null;
  sha256_original: string;
  tamano_bytes: number;
  server_id: string | null;
  sync_status: FotoComercialLocal["syncStatus"];
  sync_error_message: string | null;
  created_at: string;
};

export function getFotosComercialesLocales(productorId: string): FotoComercialLocal[] {
  const db = getDatabase();
  const owner = getCatalogSessionUserId(db);
  if (!owner) return [];
  return db.getAllSync<Row>(
    `SELECT local_id, public_id, productor_id, file_name, sha256_original,
       tamano_bytes, server_id, sync_status, sync_error_message, created_at
     FROM fotos_comerciales_productor
     WHERE productor_id = ? AND owner_user_id = ?
     ORDER BY created_at DESC, local_id DESC`,
    productorId,
    owner
  ).map((row) => ({
    localId: row.local_id,
    publicId: row.public_id,
    productorId: row.productor_id,
    fileName: row.file_name,
    sha256Original: row.sha256_original,
    sizeBytes: row.tamano_bytes,
    serverId: row.server_id,
    syncStatus: row.sync_status,
    syncErrorMessage: row.sync_error_message,
    createdAt: row.created_at
  }));
}

export async function guardarFotoComercial(productorId: string, asset: ImagePickerAsset) {
  const db = getDatabase();
  const owner = getCatalogSessionUserId(db);
  if (!owner) throw new Error("Inicia sesión antes de guardar fotos.");
  const image = ImageManipulator.manipulate(asset.uri);
  if (asset.width > 3000 || asset.height > 3000) {
    image.resize(asset.width >= asset.height ? { width: 3000 } : { height: 3000 });
  }
  const normalized = await (await image.renderAsync()).saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.9,
    base64: false
  });
  const normalizedFile = new File(normalized.uri);
  let file: File | null = null;
  let stored = false;
  try {
    const bytes = await normalizedFile.bytes();
    if (bytes.length === 0 || bytes.length > MAX_BYTES) {
      throw new Error("La foto debe ocupar menos de 10 MB.");
    }
    const hash = bytesToHex(new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes)));
    const key = await getOwnerKey(owner);
    const nonce = Crypto.getRandomBytes(12);
    const ciphertext = gcm(key, nonce).encrypt(bytes);
    const encrypted = new Uint8Array(nonce.length + ciphertext.length);
    encrypted.set(nonce);
    encrypted.set(ciphertext, nonce.length);
    directory.create({ idempotent: true, intermediates: true });
    const publicId = generatePublicId();
    const localId = generateLocalId();
    const fileName = publicId + ".enc";
    file = new File(directory, fileName);
    file.create();
    file.write(encrypted);
    const now = getNowIsoString();
    db.withTransactionSync(() => {
      db.runSync(
        `INSERT INTO fotos_comerciales_productor (
          local_id, public_id, productor_id, owner_user_id, file_name,
          sha256_original, tamano_bytes, sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        localId, publicId, productorId, owner, fileName, hash, bytes.length, now, now
      );
      insertSyncOutboxEntry(db, {
        entityType: "fotos_comerciales_productor",
        entityLocalId: localId,
        operation: "create",
        createdAt: now
      });
    });
    stored = true;
    return localId;
  } catch (error) {
    if (file?.exists) file.delete();
    throw error;
  } finally {
    try {
      if (normalizedFile.exists) normalizedFile.delete();
    } catch {
      // Una limpieza fallida no cambia el guardado confirmado.
    }
    try {
      if (stored && asset.uri.startsWith(Paths.cache.uri + "/")) {
        const pickerCopy = new File(asset.uri);
        if (pickerCopy.exists) pickerCopy.delete();
      }
    } catch {
      // Expo puede retirar su copia temporal antes que la app.
    }
  }
}

export async function leerFotoComercialParaSync(photo: FotoComercialLocal, owner: string) {
  if (!photo.fileName || !/^[0-9a-f-]{36}\.enc$/i.test(photo.fileName)) {
    throw new Error("La foto pendiente no está disponible en este dispositivo.");
  }
  const file = new File(directory, photo.fileName);
  if (!file.exists) throw new Error("La foto pendiente no está disponible en este dispositivo.");
  const encrypted = await file.bytes();
  if (encrypted.length < 29) throw new Error("La foto pendiente está dañada.");
  const nonce = encrypted.subarray(0, 12);
  const ciphertext = encrypted.subarray(12);
  const bytes = gcm(await getOwnerKey(owner), nonce).decrypt(ciphertext);
  const hash = bytesToHex(new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes)));
  if (hash !== photo.sha256Original) throw new Error("La foto pendiente no supera la verificación.");
  const temporary = new File(Paths.cache, photo.publicId + ".jpg");
  temporary.create({ overwrite: true });
  temporary.write(bytes);
  return temporary;
}

export function marcarFotoComercialSincronizada(localId: string, serverId: string, expectedOwner: string) {
  const db = getDatabase();
  const owner = getCatalogSessionUserId(db);
  if (owner !== expectedOwner) throw new ApiRequestAbortedError("La sesión cambió durante la carga.");
  const result = db.runSync(
    `UPDATE fotos_comerciales_productor
     SET server_id = ?, sync_status = 'synced', sync_error_message = NULL, updated_at = ?
     WHERE local_id = ? AND owner_user_id = ?`,
    serverId, getNowIsoString(), localId, owner
  );
  if (result.changes !== 1) {
    throw new ApiRequestAbortedError("La foto local cambió durante la carga.");
  }
}

export function limpiarFotosComercialesSincronizadas() {
  const db = getDatabase();
  const owner = getCatalogSessionUserId(db);
  if (!owner) return;
  const rows = db.getAllSync<{ local_id: string; file_name: string }>(
    `SELECT local_id, file_name FROM fotos_comerciales_productor
     WHERE owner_user_id = ? AND sync_status = 'synced' AND file_name IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM sync_outbox
         WHERE sync_outbox.owner_user_id = fotos_comerciales_productor.owner_user_id
           AND sync_outbox.entity_type = 'fotos_comerciales_productor'
           AND sync_outbox.entity_local_id = fotos_comerciales_productor.local_id
       )`,
    owner
  );
  for (const row of rows) {
    if (!/^[0-9a-f-]{36}\.enc$/i.test(row.file_name)) continue;
    const file = new File(directory, row.file_name);
    try {
      if (file.exists) file.delete();
      db.runSync(
        "UPDATE fotos_comerciales_productor SET file_name = NULL WHERE local_id = ? AND owner_user_id = ?",
        row.local_id, owner
      );
    } catch {
      // La próxima apertura reintenta la limpieza sin afectar el estado remoto.
    }
  }
}

export function reintentarFotoComercial(localId: string) {
  const db = getDatabase();
  const owner = getCatalogSessionUserId(db);
  if (!owner) return;
  const photo = db.getFirstSync<{ local_id: string; file_name: string | null }>(
    "SELECT local_id, file_name FROM fotos_comerciales_productor WHERE local_id = ? AND owner_user_id = ?",
    localId, owner
  );
  if (!photo?.file_name) return;
  db.withTransactionSync(() => {
    deleteSyncFailureForEntity(db, "fotos_comerciales_productor", localId);
    db.runSync(
      "UPDATE fotos_comerciales_productor SET sync_status = 'pending', sync_error_message = NULL WHERE local_id = ? AND owner_user_id = ?",
      localId, owner
    );
    insertSyncOutboxEntry(db, {
      entityType: "fotos_comerciales_productor",
      entityLocalId: localId,
      operation: "create",
      createdAt: getNowIsoString()
    });
  });
}

async function getOwnerKey(owner: string): Promise<Uint8Array> {
  const existing = pendingKeys.get(owner);
  if (existing) return existing;
  const pending = (async () => {
    const name = "commercial-photos-key-" + owner;
    let value = await SecureStore.getItemAsync(name);
    if (!value) {
      value = bytesToHex(Crypto.getRandomBytes(32));
      await SecureStore.setItemAsync(name, value);
    }
    return hexToBytes(value);
  })();
  pendingKeys.set(owner, pending);
  try {
    return await pending;
  } catch (error) {
    pendingKeys.delete(owner);
    throw error;
  }
}
