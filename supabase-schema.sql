-- ============================================================
-- Apex Food Online — Supabase PostgreSQL Schema
-- Translated from SQLite (better-sqlite3) schema in lib/db.ts
-- ============================================================

-- Raw materials (insumos / shopping list)
CREATE TABLE IF NOT EXISTS raw_materials (
  id                  BIGSERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  category            TEXT,
  purchase_price      NUMERIC NOT NULL DEFAULT 0,
  purchase_unit       TEXT NOT NULL,
  conversion_factor   NUMERIC NOT NULL DEFAULT 1,
  converted_unit      TEXT NOT NULL,
  stock_quantity      NUMERIC DEFAULT 0,
  last_purchase_price NUMERIC,
  min_stock           NUMERIC DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Technical sheets (fichas técnicas / recipes)
CREATE TABLE IF NOT EXISTS technical_sheets (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  yield      NUMERIC DEFAULT 1,
  yield_unit TEXT DEFAULT 'un',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingredients for technical sheets
CREATE TABLE IF NOT EXISTS technical_sheet_ingredients (
  id                  BIGSERIAL PRIMARY KEY,
  technical_sheet_id  BIGINT NOT NULL REFERENCES technical_sheets(id),
  raw_material_id     BIGINT NOT NULL REFERENCES raw_materials(id),
  quantity            NUMERIC NOT NULL,
  loss_coefficient    NUMERIC DEFAULT 1.0,
  gain_coefficient    NUMERIC DEFAULT 1.0
);

-- Menu components (groups of technical sheets)
CREATE TABLE IF NOT EXISTS menu_components (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_component_items (
  id                  BIGSERIAL PRIMARY KEY,
  menu_component_id   BIGINT NOT NULL REFERENCES menu_components(id),
  technical_sheet_id  BIGINT NOT NULL REFERENCES technical_sheets(id),
  quantity            NUMERIC NOT NULL
);

-- Final meals (cardápio)
CREATE TABLE IF NOT EXISTS meals (
  id                  BIGSERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  sale_price          NUMERIC NOT NULL DEFAULT 0,
  ifood_fee_percent   NUMERIC DEFAULT 27.0,
  tax_percent         NUMERIC DEFAULT 0,
  packaging_cost      NUMERIC DEFAULT 0,
  cutlery_cost        NUMERIC DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_compositions (
  id                  BIGSERIAL PRIMARY KEY,
  meal_id             BIGINT NOT NULL REFERENCES meals(id),
  menu_component_id   BIGINT NOT NULL REFERENCES technical_sheets(id),
  quantity            NUMERIC NOT NULL
);

-- Disposables (descartáveis / embalagens)
CREATE TABLE IF NOT EXISTS disposables (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'Outros',
  unit           TEXT NOT NULL DEFAULT 'un',
  unit_cost      NUMERIC NOT NULL DEFAULT 0,
  stock_quantity NUMERIC NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_disposables (
  id            BIGSERIAL PRIMARY KEY,
  meal_id       BIGINT NOT NULL REFERENCES meals(id),
  disposable_id BIGINT NOT NULL REFERENCES disposables(id),
  quantity      NUMERIC NOT NULL DEFAULT 1
);

-- Suppliers (fornecedores)
CREATE TABLE IF NOT EXISTS suppliers (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  contact    TEXT,
  cnpj       TEXT,
  address    TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brands (marcas)
CREATE TABLE IF NOT EXISTS brands (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  status     TEXT DEFAULT 'Aprovada',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping sessions (compras)
CREATE TABLE IF NOT EXISTS shopping_sessions (
  id         BIGSERIAL PRIMARY KEY,
  date       TIMESTAMPTZ DEFAULT NOW(),
  total_cost NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS shopping_session_items (
  id              BIGSERIAL PRIMARY KEY,
  session_id      BIGINT NOT NULL REFERENCES shopping_sessions(id),
  raw_material_id BIGINT NOT NULL REFERENCES raw_materials(id),
  quantity        NUMERIC NOT NULL,
  unit_price      NUMERIC NOT NULL,
  total_price     NUMERIC NOT NULL,
  supplier_id     BIGINT REFERENCES suppliers(id),
  brand           TEXT DEFAULT 'Genérica'
);

-- Stock by brand
CREATE TABLE IF NOT EXISTS raw_material_stock_by_brand (
  id              BIGSERIAL PRIMARY KEY,
  raw_material_id BIGINT NOT NULL REFERENCES raw_materials(id),
  brand           TEXT NOT NULL DEFAULT 'Genérica',
  stock_quantity  NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(raw_material_id, brand)
);

-- Operating expenses (despesas)
CREATE TABLE IF NOT EXISTS expenses (
  id                  BIGSERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  value               NUMERIC NOT NULL,
  period              TEXT NOT NULL,
  shopping_session_id BIGINT REFERENCES shopping_sessions(id),
  paid                BOOLEAN NOT NULL DEFAULT FALSE,
  nf_number           TEXT,
  nf_date             TEXT,
  nf_notes            TEXT,
  nf_key              TEXT,
  nf_file             TEXT,
  due_date            TEXT,
  supplier_id         BIGINT REFERENCES suppliers(id),
  employee_id         BIGINT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Expense categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default categories
INSERT INTO expense_categories (name) VALUES
  ('Mão de Obra'),
  ('Fixa'),
  ('Equipamento'),
  ('Limpeza'),
  ('Variável / Insumos')
ON CONFLICT (name) DO NOTHING;

-- Furniture / assets (mobiliário)
CREATE TABLE IF NOT EXISTS furniture (
  id                           BIGSERIAL PRIMARY KEY,
  name                         TEXT NOT NULL,
  category                     TEXT,
  quantity                     NUMERIC DEFAULT 1,
  unit_price                   NUMERIC DEFAULT 0,
  purchase_date                TEXT,
  condition                    TEXT,
  annual_depreciation_percent  NUMERIC DEFAULT 10.0,
  notes                        TEXT,
  created_at                   TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenances (manutenções)
CREATE TABLE IF NOT EXISTS maintenances (
  id               BIGSERIAL PRIMARY KEY,
  furniture_id     BIGINT NOT NULL REFERENCES furniture(id),
  description      TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'Corretiva',
  cost             NUMERIC NOT NULL DEFAULT 0,
  maintenance_date TEXT NOT NULL,
  technician       TEXT,
  supplier_id      BIGINT REFERENCES suppliers(id),
  expense_id       BIGINT REFERENCES expenses(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Sales (lançamentos / vendas)
CREATE TABLE IF NOT EXISTS sales (
  id                   BIGSERIAL PRIMARY KEY,
  meal_id              BIGINT,
  meal_name            TEXT NOT NULL,
  quantity             INTEGER NOT NULL DEFAULT 1,
  sale_date            TEXT NOT NULL,
  channel              TEXT NOT NULL DEFAULT 'iFood',
  unit_sale_price      NUMERIC NOT NULL,
  unit_food_cost       NUMERIC NOT NULL,
  unit_packaging_cost  NUMERIC NOT NULL,
  ifood_fee_percent    NUMERIC NOT NULL,
  tax_percent          NUMERIC NOT NULL,
  unit_ifood_fee       NUMERIC NOT NULL,
  unit_tax             NUMERIC NOT NULL,
  unit_profit          NUMERIC NOT NULL,
  total_revenue        NUMERIC NOT NULL,
  total_profit         NUMERIC NOT NULL,
  collaborator_id      BIGINT,
  collaborator_name    TEXT,
  payment_method       TEXT,
  payment_received     BOOLEAN DEFAULT FALSE,
  payment_received_at  TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Collaborators (colaboradores — commission based)
CREATE TABLE IF NOT EXISTS collaborators (
  id                 BIGSERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  role               TEXT NOT NULL DEFAULT 'Colaborador',
  contact            TEXT,
  cpf                TEXT,
  cnpj               TEXT,
  commission_type    TEXT NOT NULL DEFAULT 'total',
  commission_percent NUMERIC NOT NULL DEFAULT 0,
  aliquota_percent   NUMERIC DEFAULT 0,
  precificacao       TEXT DEFAULT 'Todas',
  allowed_meals      TEXT,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Employees / funcionários (CLT)
CREATE TABLE IF NOT EXISTS employees (
  id                       BIGSERIAL PRIMARY KEY,
  name                     TEXT NOT NULL,
  role                     TEXT NOT NULL DEFAULT 'Auxiliar',
  cpf                      TEXT,
  rg                       TEXT,
  pis                      TEXT,
  ctps_number              TEXT,
  ctps_serie               TEXT,
  admission_date           TEXT,
  dismissal_date           TEXT,
  base_salary              NUMERIC NOT NULL DEFAULT 0,
  transport_voucher        NUMERIC NOT NULL DEFAULT 0,
  meal_voucher             NUMERIC NOT NULL DEFAULT 0,
  health_plan              NUMERIC NOT NULL DEFAULT 0,
  work_schedule            TEXT DEFAULT '08:00-17:00',
  bank                     TEXT,
  bank_agency              TEXT,
  bank_account             TEXT,
  bank_pix                 TEXT,
  emergency_contact_name   TEXT,
  emergency_contact_phone  TEXT,
  address                  TEXT,
  status                   TEXT NOT NULL DEFAULT 'Ativo',
  notes                    TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Production logs
CREATE TABLE IF NOT EXISTS production_logs (
  id                    BIGSERIAL PRIMARY KEY,
  technical_sheet_id    BIGINT,
  technical_sheet_name  TEXT NOT NULL,
  quantity_produced     NUMERIC NOT NULL,
  yield_unit            TEXT NOT NULL DEFAULT 'un',
  notes                 TEXT,
  produced_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_log_items (
  id                  BIGSERIAL PRIMARY KEY,
  production_log_id   BIGINT NOT NULL REFERENCES production_logs(id),
  raw_material_id     BIGINT,
  raw_material_name   TEXT NOT NULL,
  quantity_deducted   NUMERIC NOT NULL,
  purchase_unit       TEXT NOT NULL
);

-- ============================================================
-- Row Level Security (optional — enable per-table as needed)
-- ============================================================
-- ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "anon read" ON raw_materials FOR SELECT USING (true);
-- ... repeat for each table as required
