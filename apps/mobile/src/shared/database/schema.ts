export const SQL_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS cultivos (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS variedades (
    id TEXT PRIMARY KEY NOT NULL,
    cultivo_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (cultivo_id) REFERENCES cultivos(id)
  )`,
  `CREATE TABLE IF NOT EXISTS campanias (
    id TEXT PRIMARY KEY NOT NULL,
    cultivo_id TEXT NOT NULL,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (cultivo_id) REFERENCES cultivos(id)
  )`,
  `CREATE TABLE IF NOT EXISTS etapas_fenologicas (
    id TEXT PRIMARY KEY NOT NULL,
    cultivo_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (cultivo_id) REFERENCES cultivos(id)
  )`,
  `CREATE TABLE IF NOT EXISTS pest_diseases (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS incidence_levels (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS recommendation_types (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS application_frequencies (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    interval_days INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS productores (
    id TEXT PRIMARY KEY NOT NULL,
    public_id TEXT NOT NULL,
    document_type_id INTEGER NOT NULL,
    document_number TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sectores (
    id TEXT PRIMARY KEY NOT NULL,
    productor_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (productor_id) REFERENCES productores(id)
  )`,
  `CREATE TABLE IF NOT EXISTS parcelas (
    id TEXT PRIMARY KEY NOT NULL,
    public_id TEXT NOT NULL,
    sector_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    area_hectares TEXT,
    description TEXT,
    reference_point TEXT,
    geometry TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (sector_id) REFERENCES sectores(id)
  )`,
  `CREATE TABLE IF NOT EXISTS visitas_campo (
    local_id TEXT PRIMARY KEY NOT NULL,
    server_id TEXT,
    public_id TEXT,
    nro_ficha TEXT,
    crop_id TEXT NOT NULL,
    variety_id TEXT NOT NULL,
    parcela_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    agronomist_user_id TEXT NOT NULL,
    plants_count INTEGER,
    sowing_date TEXT,
    visit_date TEXT NOT NULL,
    start_visit_time TEXT NOT NULL,
    end_visit_time TEXT,
    phenological_stage_id TEXT,
    general_observation TEXT,
    agronomist_signature_name TEXT,
    producer_signature_name TEXT,
    visit_location TEXT,
    synchronized_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (crop_id) REFERENCES cultivos(id),
    FOREIGN KEY (variety_id) REFERENCES variedades(id),
    FOREIGN KEY (parcela_id) REFERENCES parcelas(id),
    FOREIGN KEY (campaign_id) REFERENCES campanias(id),
    FOREIGN KEY (phenological_stage_id) REFERENCES etapas_fenologicas(id)
  )`,
  `CREATE TABLE IF NOT EXISTS visita_evaluaciones (
    local_id TEXT PRIMARY KEY NOT NULL,
    server_id TEXT,
    visita_local_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    percentage TEXT,
    description TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (visita_local_id) REFERENCES visitas_campo(local_id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS visita_observaciones_sanitarias (
    local_id TEXT PRIMARY KEY NOT NULL,
    server_id TEXT,
    visita_local_id TEXT NOT NULL,
    pest_disease_id TEXT NOT NULL,
    incidence_level_id TEXT,
    observation TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (visita_local_id) REFERENCES visitas_campo(local_id) ON DELETE CASCADE,
    FOREIGN KEY (pest_disease_id) REFERENCES pest_diseases(id),
    FOREIGN KEY (incidence_level_id) REFERENCES incidence_levels(id)
  )`,
  `CREATE TABLE IF NOT EXISTS visita_recomendaciones (
    local_id TEXT PRIMARY KEY NOT NULL,
    server_id TEXT,
    visita_local_id TEXT NOT NULL,
    recommendation_type_id TEXT NOT NULL,
    applies INTEGER NOT NULL DEFAULT 0,
    detail TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (visita_local_id) REFERENCES visitas_campo(local_id) ON DELETE CASCADE,
    FOREIGN KEY (recommendation_type_id) REFERENCES recommendation_types(id)
  )`,
  `CREATE TABLE IF NOT EXISTS visita_productos_recomendados (
    local_id TEXT PRIMARY KEY NOT NULL,
    server_id TEXT,
    visita_local_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    dose TEXT NOT NULL,
    application_frequency_id TEXT,
    instructions TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (visita_local_id) REFERENCES visitas_campo(local_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (application_frequency_id) REFERENCES application_frequencies(id)
  )`,
  `CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  )`
] as const;
