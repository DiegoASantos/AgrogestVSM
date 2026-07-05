import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const NOMBRES_COMERCIALES_RECETA_MIGRATION: DatabaseMigration = {
  id: "028-nombres-comerciales-receta",
  description:
    "Links commercial product names to fitosanitary product types and seeds recipe commercial-name catalogs.",
  sql: `
    ALTER TABLE marcas_producto
      ADD COLUMN IF NOT EXISTS tipo_producto_id bigint;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'marcas_producto_tipo_producto_id_fkey'
      ) THEN
        ALTER TABLE marcas_producto
          ADD CONSTRAINT marcas_producto_tipo_producto_id_fkey
          FOREIGN KEY (tipo_producto_id)
          REFERENCES tipos_producto_fitosanitario(id)
          ON DELETE SET NULL;
      END IF;
    END
    $$;

    CREATE INDEX IF NOT EXISTS idx_marcas_producto_tipo_producto_id
      ON marcas_producto(tipo_producto_id);

    INSERT INTO tipos_producto_fitosanitario (nombre)
    SELECT source.nombre
    FROM (
      VALUES
        ('Fungicida'),
        ('Insecticida'),
        ('Acaricida'),
        ('Herbicida'),
        ('Nematicida'),
        ('Bactericida'),
        ('Reg. Crecimiento'),
        ('Adherente/pegante'),
        ('Tensoactivo'),
        ('Corrector de pH'),
        ('Ablandador de agua')
    ) AS source(nombre)
    WHERE NOT EXISTS (
      SELECT 1
      FROM tipos_producto_fitosanitario target
      WHERE lower(target.nombre) = lower(source.nombre)
    );

    INSERT INTO ingredientes_activos (nombre)
    SELECT source.nombre
    FROM (
      VALUES
        ('Thiabendazole'),
        ('Azoxystrobin + Difenoconazole'),
        ('Spinetoram'),
        ('Imidacloprid'),
        ('Abamectina'),
        ('Glifosato'),
        ('Fluopyram'),
        ('Oxicloruro de Cobre'),
        ('Paclobutrazol'),
        ('Resina sintética'),
        ('Poliéster modificado'),
        ('Ácido orgánico + indicador'),
        ('Secuestrante de sales')
    ) AS source(nombre)
    WHERE NOT EXISTS (
      SELECT 1
      FROM ingredientes_activos target
      WHERE lower(target.nombre) = lower(source.nombre)
    );

    WITH catalogo(tipo_nombre, ingrediente_nombre, nombre_comercial) AS (
      VALUES
        ('Fungicida', 'Thiabendazole', 'Mertect 500 SC'),
        ('Fungicida', 'Thiabendazole', 'Thiabendox 500 SC'),
        ('Fungicida', 'Azoxystrobin + Difenoconazole', 'Amistar Top'),
        ('Fungicida', 'Azoxystrobin + Difenoconazole', 'Susku'),
        ('Insecticida', 'Spinetoram', 'Radiant'),
        ('Insecticida', 'Spinetoram', 'Absolute 60 SC'),
        ('Insecticida', 'Imidacloprid', 'Confidor 350 SC'),
        ('Insecticida', 'Imidacloprid', 'Imidaprime 350 SC'),
        ('Acaricida', 'Abamectina', 'Vertimec 1.8 EC'),
        ('Acaricida', 'Abamectina', 'Apache 1.8 EC'),
        ('Herbicida', 'Glifosato', 'RoundUp (o Pampa)'),
        ('Herbicida', 'Glifosato', 'Panzer 480 SL'),
        ('Nematicida', 'Fluopyram', 'Velum Prime 400 SC'),
        ('Bactericida', 'Oxicloruro de Cobre', 'Cupravit Mix'),
        ('Bactericida', 'Oxicloruro de Cobre', 'Cúprico TQC'),
        ('Reg. Crecimiento', 'Paclobutrazol', 'Cultar 25 SC'),
        ('Reg. Crecimiento', 'Paclobutrazol', 'Ajustar 25 SC'),
        ('Adherente/pegante', 'Resina sintética', 'Inex-A'),
        ('Tensoactivo', 'Poliéster modificado', 'Silwet L-77'),
        ('Corrector de pH', 'Ácido orgánico + indicador', 'Buffer P.H.'),
        ('Ablandador de agua', 'Secuestrante de sales', 'Cosmo-In D')
    ),
    resolved AS (
      SELECT
        tipo.id AS tipo_producto_id,
        ingrediente.id AS ingrediente_activo_id,
        catalogo.nombre_comercial
      FROM catalogo
      INNER JOIN tipos_producto_fitosanitario tipo
        ON lower(tipo.nombre) = lower(catalogo.tipo_nombre)
      INNER JOIN ingredientes_activos ingrediente
        ON lower(ingrediente.nombre) = lower(catalogo.ingrediente_nombre)
    )
    UPDATE marcas_producto marca
    SET
      tipo_producto_id = resolved.tipo_producto_id,
      ingrediente_activo_id = COALESCE(
        marca.ingrediente_activo_id,
        resolved.ingrediente_activo_id
      ),
      actualizado_at = now()
    FROM resolved
    WHERE lower(marca.nombre) = lower(resolved.nombre_comercial);

    WITH catalogo(tipo_nombre, ingrediente_nombre, nombre_comercial) AS (
      VALUES
        ('Fungicida', 'Thiabendazole', 'Mertect 500 SC'),
        ('Fungicida', 'Thiabendazole', 'Thiabendox 500 SC'),
        ('Fungicida', 'Azoxystrobin + Difenoconazole', 'Amistar Top'),
        ('Fungicida', 'Azoxystrobin + Difenoconazole', 'Susku'),
        ('Insecticida', 'Spinetoram', 'Radiant'),
        ('Insecticida', 'Spinetoram', 'Absolute 60 SC'),
        ('Insecticida', 'Imidacloprid', 'Confidor 350 SC'),
        ('Insecticida', 'Imidacloprid', 'Imidaprime 350 SC'),
        ('Acaricida', 'Abamectina', 'Vertimec 1.8 EC'),
        ('Acaricida', 'Abamectina', 'Apache 1.8 EC'),
        ('Herbicida', 'Glifosato', 'RoundUp (o Pampa)'),
        ('Herbicida', 'Glifosato', 'Panzer 480 SL'),
        ('Nematicida', 'Fluopyram', 'Velum Prime 400 SC'),
        ('Bactericida', 'Oxicloruro de Cobre', 'Cupravit Mix'),
        ('Bactericida', 'Oxicloruro de Cobre', 'Cúprico TQC'),
        ('Reg. Crecimiento', 'Paclobutrazol', 'Cultar 25 SC'),
        ('Reg. Crecimiento', 'Paclobutrazol', 'Ajustar 25 SC'),
        ('Adherente/pegante', 'Resina sintética', 'Inex-A'),
        ('Tensoactivo', 'Poliéster modificado', 'Silwet L-77'),
        ('Corrector de pH', 'Ácido orgánico + indicador', 'Buffer P.H.'),
        ('Ablandador de agua', 'Secuestrante de sales', 'Cosmo-In D')
    ),
    resolved AS (
      SELECT
        tipo.id AS tipo_producto_id,
        ingrediente.id AS ingrediente_activo_id,
        catalogo.nombre_comercial
      FROM catalogo
      INNER JOIN tipos_producto_fitosanitario tipo
        ON lower(tipo.nombre) = lower(catalogo.tipo_nombre)
      INNER JOIN ingredientes_activos ingrediente
        ON lower(ingrediente.nombre) = lower(catalogo.ingrediente_nombre)
    )
    INSERT INTO marcas_producto (
      nombre,
      tipo_producto_id,
      ingrediente_activo_id
    )
    SELECT
      resolved.nombre_comercial,
      resolved.tipo_producto_id,
      resolved.ingrediente_activo_id
    FROM resolved
    WHERE NOT EXISTS (
      SELECT 1
      FROM marcas_producto marca
      WHERE lower(marca.nombre) = lower(resolved.nombre_comercial)
    );

    -- Rollback operativo:
    -- 1. Detener clientes que dependen del filtrado por tipo de producto.
    -- 2. Respaldar los catalogos marcas_producto, ingredientes_activos y tipos_producto_fitosanitario.
    -- 3. Ejecutar:
    --    DROP INDEX IF EXISTS idx_marcas_producto_tipo_producto_id;
    --    ALTER TABLE marcas_producto DROP CONSTRAINT IF EXISTS marcas_producto_tipo_producto_id_fkey;
    --    ALTER TABLE marcas_producto DROP COLUMN IF EXISTS tipo_producto_id;
    -- 4. No borrar automaticamente semillas de catalogo: pueden estar referenciadas por recetas historicas.
  `
};
