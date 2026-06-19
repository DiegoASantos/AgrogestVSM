import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const VISITA_RECETAS_MIGRATION: DatabaseMigration = {
  id: "019-visita-recetas",
  description:
    "Creates receta catalog tables (coadyuvantes, ingredientes_activos, marcas_producto, modos_accion, tipos_control, tipos_producto_fitosanitario, fertilizantes) and receta record tables.",
  sql: `
    CREATE TABLE IF NOT EXISTS coadyuvantes (
      id bigserial PRIMARY KEY,
      nombre varchar(100) NOT NULL,
      descripcion text,
      activo boolean NOT NULL DEFAULT true,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS ingredientes_activos (
      id bigserial PRIMARY KEY,
      nombre varchar(150) NOT NULL,
      descripcion text,
      activo boolean NOT NULL DEFAULT true,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS marcas_producto (
      id bigserial PRIMARY KEY,
      nombre varchar(150) NOT NULL,
      ingrediente_activo_id bigint,
      concentracion numeric(10, 4),
      activo boolean NOT NULL DEFAULT true,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT marcas_producto_ingrediente_activo_id_fkey
        FOREIGN KEY (ingrediente_activo_id) REFERENCES ingredientes_activos(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS modos_accion (
      id bigserial PRIMARY KEY,
      nombre varchar(100) NOT NULL,
      activo boolean NOT NULL DEFAULT true,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS tipos_control (
      id bigserial PRIMARY KEY,
      nombre varchar(100) NOT NULL,
      activo boolean NOT NULL DEFAULT true,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS tipos_producto_fitosanitario (
      id bigserial PRIMARY KEY,
      nombre varchar(100) NOT NULL,
      activo boolean NOT NULL DEFAULT true,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS fertilizantes (
      id bigserial PRIMARY KEY,
      nombre varchar(150) NOT NULL,
      tipo varchar(20) NOT NULL CHECK (tipo IN ('solido', 'liquido')),
      activo boolean NOT NULL DEFAULT true,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS visita_recetas (
      id bigserial PRIMARY KEY,
      visita_id bigint NOT NULL,
      etapa_fenologica text,
      version integer NOT NULL DEFAULT 1,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT visita_recetas_visita_id_key UNIQUE (visita_id),
      CONSTRAINT visita_recetas_visita_id_fkey
        FOREIGN KEY (visita_id) REFERENCES visitas_campo(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS visita_receta_fitosanidad (
      id bigserial PRIMARY KEY,
      receta_id bigint NOT NULL,
      numero integer NOT NULL DEFAULT 1,
      objetivo varchar(20) NOT NULL CHECK (objetivo IN ('plaga', 'enfermedad')),
      objetivo_nombre varchar(150) NOT NULL,
      tipo_control_id bigint,
      tipo_producto_id bigint,
      disolvente varchar(100) NOT NULL DEFAULT 'Agua',
      modo_accion_id bigint,
      ingrediente_activo_nombre varchar(150),
      dosis_ia numeric(12, 4),
      volumen_aplicacion numeric(12, 4),
      cantidad_total_ia numeric(14, 4),
      marca_producto_nombre varchar(150),
      concentracion_producto numeric(12, 4),
      cantidad_total_producto numeric(14, 4),
      coadyuvantes_ids text,
      orden_mezcla text,
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT visita_receta_fitosanidad_receta_id_fkey
        FOREIGN KEY (receta_id) REFERENCES visita_recetas(id) ON DELETE CASCADE,
      CONSTRAINT visita_receta_fitosanidad_tipo_control_id_fkey
        FOREIGN KEY (tipo_control_id) REFERENCES tipos_control(id) ON DELETE SET NULL,
      CONSTRAINT visita_receta_fitosanidad_tipo_producto_id_fkey
        FOREIGN KEY (tipo_producto_id) REFERENCES tipos_producto_fitosanitario(id) ON DELETE SET NULL,
      CONSTRAINT visita_receta_fitosanidad_modo_accion_id_fkey
        FOREIGN KEY (modo_accion_id) REFERENCES modos_accion(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS visita_receta_fertilizacion (
      id bigserial PRIMARY KEY,
      receta_id bigint NOT NULL,
      via_aplicacion varchar(20) NOT NULL CHECK (via_aplicacion IN ('edafica', 'foliar')),
      fertilizante_nombre varchar(150),
      tipo_producto varchar(20) CHECK (tipo_producto IN ('solido', 'liquido')),
      dosis numeric(12, 4),
      unidad_dosis varchar(30),
      cantidad_total_plantas integer,
      volumen_aplicacion numeric(12, 4),
      cantidad_total_fertilizante numeric(14, 4),
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT visita_receta_fertilizacion_receta_id_fkey
        FOREIGN KEY (receta_id) REFERENCES visita_recetas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS visita_receta_riego (
      id bigserial PRIMARY KEY,
      receta_id bigint NOT NULL,
      tipo_recomendacion varchar(30) NOT NULL CHECK (tipo_recomendacion IN ('riego_pesado', 'riego_ligero', 'inicio_agoste', 'ruptura_agoste')),
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT visita_receta_riego_receta_id_key UNIQUE (receta_id),
      CONSTRAINT visita_receta_riego_receta_id_fkey
        FOREIGN KEY (receta_id) REFERENCES visita_recetas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS visita_receta_labores (
      id bigserial PRIMARY KEY,
      receta_id bigint NOT NULL,
      labor varchar(50) NOT NULL CHECK (labor IN ('limpieza_maleza_pala', 'limpieza_maleza_motoguadana', 'horqueteo', 'enzunchado', 'recoleccion_frutos', 'trampas_mosca')),
      creado_at timestamptz NOT NULL DEFAULT now(),
      actualizado_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT visita_receta_labores_receta_labor_key UNIQUE (receta_id, labor),
      CONSTRAINT visita_receta_labores_receta_id_fkey
        FOREIGN KEY (receta_id) REFERENCES visita_recetas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS visita_receta_historial (
      id bigserial PRIMARY KEY,
      receta_id bigint NOT NULL,
      version integer NOT NULL,
      snapshot jsonb NOT NULL,
      creado_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT visita_receta_historial_receta_id_fkey
        FOREIGN KEY (receta_id) REFERENCES visita_recetas(id) ON DELETE CASCADE,
      CONSTRAINT visita_receta_historial_receta_version_key UNIQUE (receta_id, version)
    );

    CREATE INDEX IF NOT EXISTS idx_visita_recetas_visita_id
      ON visita_recetas(visita_id);
    CREATE INDEX IF NOT EXISTS idx_visita_receta_fitosanidad_receta_id
      ON visita_receta_fitosanidad(receta_id);
    CREATE INDEX IF NOT EXISTS idx_visita_receta_fertilizacion_receta_id
      ON visita_receta_fertilizacion(receta_id);
    CREATE INDEX IF NOT EXISTS idx_visita_receta_labores_receta_id
      ON visita_receta_labores(receta_id);
    CREATE INDEX IF NOT EXISTS idx_visita_receta_historial_receta_id
      ON visita_receta_historial(receta_id);

    INSERT INTO tipos_control (nombre) VALUES
      ('Quimico'), ('Biologico'), ('Mecanico')
    ON CONFLICT DO NOTHING;

    INSERT INTO tipos_producto_fitosanitario (nombre) VALUES
      ('Insecticida'), ('Acaricida'), ('Fungicida'), ('Herbicida'), ('Nematicida'), ('Bactericida')
    ON CONFLICT DO NOTHING;

    INSERT INTO modos_accion (nombre) VALUES
      ('Sistemico'), ('De contacto'), ('Translaminar'), ('Repelente')
    ON CONFLICT DO NOTHING;

    INSERT INTO coadyuvantes (nombre, descripcion) VALUES
      ('Corrector de pH', 'Acondiciona el pH del agua para optimizar la eficacia del producto.'),
      ('Adherente', 'Mejora la adhesion del producto a la superficie de la planta.'),
      ('Tensoactivo', 'Reduce la tension superficial para mejorar la dispersion.'),
      ('Antideriva', 'Reduce la deriva del producto durante la aplicacion.'),
      ('Aceite penetrante', 'Facilita la penetracion del ingrediente activo en los tejidos.'),
      ('Antiespumante', 'Evita la formacion de espuma durante la mezcla.')
    ON CONFLICT DO NOTHING;
  `
};
