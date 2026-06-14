import { getDatabase } from "../../../shared/database/connection";
import { fromSqliteBoolean, toSqliteBoolean } from "../../../shared/database/sqlite-utils";
import type { NutrientCatalogItem, NutrientDetailCatalogItem } from "../types";

type NutrientRow = {
  id: string;
  cultivo_id: string;
  name: string;
  description: string | null;
  is_active: number;
};

type NutrientDetailRow = {
  id: string;
  nutriente_id: string;
  name: string;
  description: string | null;
  is_active: number;
};

export const nutricionRepository = {
  getNutrients(): NutrientCatalogItem[] {
    const db = getDatabase();
    ensureNutritionTables(db);
    const rows = db.getAllSync<NutrientRow>(
      `SELECT id, cultivo_id, name, description, is_active
       FROM nutrientes
       WHERE is_active = 1
       ORDER BY name ASC, id ASC`
    );

    return rows.map((row) => ({
      id: row.id,
      cultivoId: row.cultivo_id,
      name: row.name,
      description: row.description,
      isActive: fromSqliteBoolean(row.is_active),
      details: this.getDetailsByNutrientId(row.id)
    }));
  },

  getNutrientsByCrop(cropId: string): NutrientCatalogItem[] {
    const db = getDatabase();
    ensureNutritionTables(db);
    const rows = db.getAllSync<NutrientRow>(
      `SELECT id, cultivo_id, name, description, is_active
       FROM nutrientes
       WHERE cultivo_id = ? AND is_active = 1
       ORDER BY name ASC, id ASC`,
      cropId
    );

    return rows.map((row) => ({
      id: row.id,
      cultivoId: row.cultivo_id,
      name: row.name,
      description: row.description,
      isActive: fromSqliteBoolean(row.is_active),
      details: this.getDetailsByNutrientId(row.id)
    }));
  },

  getDetailsByNutrientId(nutrientId: string): NutrientDetailCatalogItem[] {
    const db = getDatabase();
    ensureNutritionTables(db);
    const rows = db.getAllSync<NutrientDetailRow>(
      `SELECT id, nutriente_id, name, description, is_active
       FROM detalle_nutrientes
       WHERE nutriente_id = ? AND is_active = 1
       ORDER BY name ASC, id ASC`,
      nutrientId
    );

    return rows.map((row) => ({
      id: row.id,
      nutrientId: row.nutriente_id,
      name: row.name,
      description: row.description,
      isActive: fromSqliteBoolean(row.is_active)
    }));
  },

  insertNutrients(nutrients: NutrientCatalogItem[]) {
    const db = getDatabase();
    ensureNutritionTables(db);
    db.withTransactionSync(() => {
      for (const nutrient of nutrients) {
        db.runSync(
          `INSERT OR REPLACE INTO nutrientes (id, cultivo_id, name, description, is_active)
           VALUES (?, ?, ?, ?, ?)`,
          nutrient.id,
          nutrient.cultivoId,
          nutrient.name,
          nutrient.description,
          toSqliteBoolean(nutrient.isActive)
        );

        for (const detail of nutrient.details) {
          db.runSync(
            `INSERT OR REPLACE INTO detalle_nutrientes (id, nutriente_id, name, description, is_active)
             VALUES (?, ?, ?, ?, ?)`,
            detail.id,
            detail.nutrientId,
            detail.name,
            detail.description,
            toSqliteBoolean(detail.isActive)
          );
        }
      }
    });
  }
};

function ensureNutritionTables(db: ReturnType<typeof getDatabase>) {
  db.execSync(
    `CREATE TABLE IF NOT EXISTS nutrientes (
      id TEXT PRIMARY KEY NOT NULL,
      cultivo_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (cultivo_id) REFERENCES cultivos(id)
    )`
  );
  db.execSync(
    `CREATE TABLE IF NOT EXISTS detalle_nutrientes (
      id TEXT PRIMARY KEY NOT NULL,
      nutriente_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (nutriente_id) REFERENCES nutrientes(id)
    )`
  );
  db.execSync(
    "CREATE INDEX IF NOT EXISTS idx_nutrientes_cultivo ON nutrientes(cultivo_id)"
  );
  db.execSync(
    "CREATE INDEX IF NOT EXISTS idx_detalle_nutrientes_nutriente ON detalle_nutrientes(nutriente_id)"
  );
}
