import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const CONCENTRACIONES_UNIDADES_RECETA_MIGRATION: DatabaseMigration = {
  id: "037-concentraciones-unidades-receta",
  description:
    "Stores commercial concentration and measurement unit for fitosanitary products and fertilizers without duplicating existing catalog rows.",
  sql: `
    ALTER TABLE marcas_producto
      ALTER COLUMN concentracion TYPE varchar(30)
      USING concentracion::text;

    ALTER TABLE marcas_producto
      ADD COLUMN IF NOT EXISTS unidad_medida varchar(20);

    ALTER TABLE fertilizantes
      ADD COLUMN IF NOT EXISTS concentracion varchar(30),
      ADD COLUMN IF NOT EXISTS unidad_medida varchar(20);

    UPDATE marcas_producto
    SET nombre = 'Austar 25 SC', actualizado_at = now()
    WHERE lower(trim(nombre)) = 'ajustar 25 sc'
      AND NOT EXISTS (
        SELECT 1
        FROM marcas_producto existente
        WHERE lower(trim(existente.nombre)) = 'austar 25 sc'
      );

    UPDATE marcas_producto typo
    SET activo = false, actualizado_at = now()
    WHERE lower(trim(typo.nombre)) = 'ajustar 25 sc'
      AND EXISTS (
        SELECT 1
        FROM marcas_producto correcto
        WHERE lower(trim(correcto.nombre)) = 'austar 25 sc'
          AND correcto.id <> typo.id
      );

    DROP TABLE IF EXISTS catalogo_marcas_037;

    CREATE TEMP TABLE catalogo_marcas_037 (
      tipo_nombre varchar(100) NOT NULL,
      ingrediente_nombre varchar(150) NOT NULL,
      nombre varchar(150) NOT NULL,
      concentracion varchar(30) NOT NULL,
      unidad_medida varchar(20) NOT NULL
    );

    INSERT INTO catalogo_marcas_037 (
      tipo_nombre,
      ingrediente_nombre,
      nombre,
      concentracion,
      unidad_medida
    ) VALUES
      ('Fungicida', 'Thiabendazole', 'Mertect 500 SC', '500', 'g/L'),
      ('Fungicida', 'Thiabendazole', 'Thiabendox 500 SC', '500', 'g/L'),
      ('Fungicida', 'Azoxystrobin + Difenoconazole', 'Amistar Top', '325', 'g/L'),
      ('Fungicida', 'Azoxystrobin + Difenoconazole', 'Susku', '325', 'g/L'),
      ('Insecticida', 'Spinetoram', 'Radiant', '120', 'g/L'),
      ('Insecticida', 'Spinetoram', 'Absolute 60 SC', '60', 'g/L'),
      ('Insecticida', 'Imidacloprid', 'Confidor 350 SC', '350', 'g/L'),
      ('Insecticida', 'Imidacloprid', 'Imidaprime 350 SC', '350', 'g/L'),
      ('Acaricida', 'Abamectina', 'Vertimec 1.8 EC', '18', 'g/L'),
      ('Acaricida', 'Abamectina', 'Apache 1.8 EC', '18', 'g/L'),
      ('Herbicida', 'Glifosato', 'RoundUp (o Pampa)', '480', 'g/L'),
      ('Herbicida', 'Glifosato', 'Panzer 480 SL', '480', 'g/L'),
      ('Nematicida', 'Fluopyram', 'Velum Prime 400 SC', '500', 'g/L'),
      ('Bactericida', 'Oxicloruro de Cobre', 'Cupravit Mix', '850', 'g/Kg'),
      ('Bactericida', 'Oxicloruro de Cobre', 'Cúprico TQC', '850', 'g/Kg'),
      ('Reg. Crecimiento', 'Paclobutrazol', 'Cultar 25 SC', '250', 'g/L'),
      ('Reg. Crecimiento', 'Paclobutrazol', 'Austar 25 SC', '250', 'g/L'),
      ('Adherente/pegante', 'Resina sintética', 'Inex-A', '100', '%'),
      ('Tensoactivo', 'Poliéster modificado', 'Silwet L-77', '100', '%'),
      ('Corrector de pH', 'Ácido orgánico + indicador', 'Buffer P.H.', 'Variado', 'L'),
      ('Ablandador de agua', 'Secuestrante de sales', 'Cosmo-In D', '100', 'g/Kg');

    UPDATE marcas_producto marca
    SET
      concentracion = catalogo.concentracion,
      unidad_medida = catalogo.unidad_medida,
      tipo_producto_id = COALESCE(marca.tipo_producto_id, tipo.id),
      ingrediente_activo_id = COALESCE(marca.ingrediente_activo_id, ingrediente.id),
      activo = true,
      actualizado_at = now()
    FROM catalogo_marcas_037 catalogo
    INNER JOIN tipos_producto_fitosanitario tipo
      ON lower(trim(tipo.nombre)) = lower(trim(catalogo.tipo_nombre))
    INNER JOIN ingredientes_activos ingrediente
      ON lower(trim(ingrediente.nombre)) = lower(trim(catalogo.ingrediente_nombre))
    WHERE lower(trim(marca.nombre)) = lower(trim(catalogo.nombre));

    INSERT INTO marcas_producto (
      nombre,
      tipo_producto_id,
      ingrediente_activo_id,
      concentracion,
      unidad_medida
    )
    SELECT
      catalogo.nombre,
      tipo.id,
      ingrediente.id,
      catalogo.concentracion,
      catalogo.unidad_medida
    FROM catalogo_marcas_037 catalogo
    INNER JOIN tipos_producto_fitosanitario tipo
      ON lower(trim(tipo.nombre)) = lower(trim(catalogo.tipo_nombre))
    INNER JOIN ingredientes_activos ingrediente
      ON lower(trim(ingrediente.nombre)) = lower(trim(catalogo.ingrediente_nombre))
    WHERE NOT EXISTS (
      SELECT 1
      FROM marcas_producto existente
      WHERE lower(trim(existente.nombre)) = lower(trim(catalogo.nombre))
    );

    DROP TABLE catalogo_marcas_037;

    UPDATE fertilizantes combinado
    SET nombre = 'Aminofol', actualizado_at = now()
    WHERE lower(trim(combinado.nombre)) IN ('aminofol / isabion', 'aminofol/isabion')
      AND NOT EXISTS (
        SELECT 1 FROM fertilizantes existente
        WHERE lower(trim(existente.nombre)) = 'aminofol'
      );

    UPDATE fertilizantes combinado
    SET nombre = 'Alstar', actualizado_at = now()
    WHERE lower(trim(combinado.nombre)) IN ('alstar / acadian', 'alstar/acadian')
      AND NOT EXISTS (
        SELECT 1 FROM fertilizantes existente
        WHERE lower(trim(existente.nombre)) = 'alstar'
      );

    UPDATE fertilizantes combinado
    SET activo = false, actualizado_at = now()
    WHERE lower(trim(combinado.nombre)) IN (
      'aminofol / isabion',
      'aminofol/isabion',
      'alstar / acadian',
      'alstar/acadian'
    );

    DROP TABLE IF EXISTS catalogo_fertilizantes_037;

    CREATE TEMP TABLE catalogo_fertilizantes_037 (
      nombre varchar(150) NOT NULL,
      tipo varchar(20) NOT NULL,
      concentracion varchar(30) NOT NULL,
      unidad_medida varchar(20) NOT NULL
    );

    INSERT INTO catalogo_fertilizantes_037 (
      nombre,
      tipo,
      concentracion,
      unidad_medida
    ) VALUES
      ('Urea Agrícola', 'solido', '46', '%'),
      ('DAP', 'solido', '18-46-00', '%'),
      ('Sulfato de Potasio', 'solido', '50', '%'),
      ('Yaraliva Calcinit', 'solido', '26 - 15.5', '%'),
      ('Sulfato Magnesio', 'solido', '16 - 12', '%'),
      ('Solubor', 'solido', '20.5', '%'),
      ('Basfoliar Zinc', 'liquido', '150', 'g/L'),
      ('Kelatox Zinc', 'liquido', '150', 'g/L'),
      ('Hortrilon', 'solido', 'Variado', '%'),
      ('Aminofol', 'liquido', '300', 'g/L'),
      ('Isabion', 'liquido', '300', 'g/L'),
      ('Naturamin WSP', 'solido', '800', 'g/Kg'),
      ('Alstar', 'liquido', '100', '%'),
      ('Acadian', 'liquido', '100', '%'),
      ('Basfoliar Kelp', 'liquido', '100', '%');

    UPDATE fertilizantes fertilizante
    SET
      tipo = catalogo.tipo,
      concentracion = catalogo.concentracion,
      unidad_medida = catalogo.unidad_medida,
      activo = true,
      actualizado_at = now()
    FROM catalogo_fertilizantes_037 catalogo
    WHERE lower(trim(fertilizante.nombre)) = lower(trim(catalogo.nombre));

    INSERT INTO fertilizantes (nombre, tipo, concentracion, unidad_medida)
    SELECT
      catalogo.nombre,
      catalogo.tipo,
      catalogo.concentracion,
      catalogo.unidad_medida
    FROM catalogo_fertilizantes_037 catalogo
    WHERE NOT EXISTS (
      SELECT 1
      FROM fertilizantes existente
      WHERE lower(trim(existente.nombre)) = lower(trim(catalogo.nombre))
    );

    DROP TABLE catalogo_fertilizantes_037;

    -- Rollback operativo: conservar columnas y datos porque los clientes nuevos
    -- dependen de ellos. Revertir primero mobile y API. Una futura contraccion de
    -- marcas_producto.concentracion a numeric requiere normalizar previamente los
    -- valores compuestos y cualitativos, por lo que no se automatiza aqui.
  `
};
