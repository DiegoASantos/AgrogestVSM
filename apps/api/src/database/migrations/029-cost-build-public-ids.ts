import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const COST_BUILD_PUBLIC_IDS_MIGRATION: DatabaseMigration = {
  id: "029-cost-build-public-ids",
  description:
    "Adds public UUIDs to catalogs exported through the Cost-Build integration.",
  sql: `
    ALTER TABLE cultivos
      ADD COLUMN IF NOT EXISTS public_id uuid;
    UPDATE cultivos
      SET public_id = gen_random_uuid()
      WHERE public_id IS NULL;
    ALTER TABLE cultivos
      ALTER COLUMN public_id SET DEFAULT gen_random_uuid(),
      ALTER COLUMN public_id SET NOT NULL;
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'cultivos_public_id_key'
      ) THEN
        ALTER TABLE cultivos
          ADD CONSTRAINT cultivos_public_id_key UNIQUE (public_id);
      END IF;
    END $$;

    ALTER TABLE variedades
      ADD COLUMN IF NOT EXISTS public_id uuid;
    UPDATE variedades
      SET public_id = gen_random_uuid()
      WHERE public_id IS NULL;
    ALTER TABLE variedades
      ALTER COLUMN public_id SET DEFAULT gen_random_uuid(),
      ALTER COLUMN public_id SET NOT NULL;
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'variedades_public_id_key'
      ) THEN
        ALTER TABLE variedades
          ADD CONSTRAINT variedades_public_id_key UNIQUE (public_id);
      END IF;
    END $$;

    ALTER TABLE campanias
      ADD COLUMN IF NOT EXISTS public_id uuid;
    UPDATE campanias
      SET public_id = gen_random_uuid()
      WHERE public_id IS NULL;
    ALTER TABLE campanias
      ALTER COLUMN public_id SET DEFAULT gen_random_uuid(),
      ALTER COLUMN public_id SET NOT NULL;
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'campanias_public_id_key'
      ) THEN
        ALTER TABLE campanias
          ADD CONSTRAINT campanias_public_id_key UNIQUE (public_id);
      END IF;
    END $$;

    ALTER TABLE sectores
      ADD COLUMN IF NOT EXISTS public_id uuid;
    UPDATE sectores
      SET public_id = gen_random_uuid()
      WHERE public_id IS NULL;
    ALTER TABLE sectores
      ALTER COLUMN public_id SET DEFAULT gen_random_uuid(),
      ALTER COLUMN public_id SET NOT NULL;
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sectores_public_id_key'
      ) THEN
        ALTER TABLE sectores
          ADD CONSTRAINT sectores_public_id_key UNIQUE (public_id);
      END IF;
    END $$;

    -- Rollback operativo:
    -- 1. Revertir el modulo de integracion y retirar COST_BUILD_API_KEY.
    -- 2. Conservar public_id porque es aditivo y otros sistemas pueden haberlo
    --    persistido como id_origen.
    -- 3. Si una contraccion posterior queda aprobada, dropear primero los
    --    constraints *_public_id_key y luego las columnas public_id.
  `
};
