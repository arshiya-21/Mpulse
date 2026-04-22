-- MPulse Schema
-- PostgreSQL 16

-- ── Departments ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  status     VARCHAR(20)  NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Roles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Employees ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id                      SERIAL PRIMARY KEY,
  name                    VARCHAR(200) NOT NULL,
  email                   VARCHAR(200) NOT NULL UNIQUE,
  password_hash           VARCHAR(255),
  status                  VARCHAR(20)  NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','inactive')),
  invite_status           VARCHAR(20)  NOT NULL DEFAULT 'accepted'
                            CHECK (invite_status IN ('pending','accepted')),
  department_id           INT REFERENCES departments(id) ON DELETE SET NULL,
  secondary_department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  role_id                 INT REFERENCES roles(id) ON DELETE SET NULL,
  manager_id              INT REFERENCES employees(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Employee → Manager (multi-manager) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_managers (
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  manager_id  INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  PRIMARY KEY (employee_id, manager_id)
);
CREATE INDEX IF NOT EXISTS idx_emp_mgr_employee ON employee_managers(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_mgr_manager  ON employee_managers(manager_id);

-- ── Projects ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  status        VARCHAR(30)  NOT NULL DEFAULT 'Not Started'
                  CHECK (status IN ('Not Started','In Progress','On Hold','Completed','Cancelled')),
  start_date    DATE,
  end_date      DATE,
  closed_at     TIMESTAMPTZ,
  description   TEXT,
  created_by    INT REFERENCES employees(id) ON DELETE SET NULL,
  department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tasks (Work Log) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  task_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
  employee_id INT          NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  project_id  INT          NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
  category    VARCHAR(100),
  work_type   VARCHAR(100),
  spent_mins  INT          NOT NULL DEFAULT 0 CHECK (spent_mins >= 0),
  tat_days    INT          NOT NULL DEFAULT 0,
  status      VARCHAR(30)  NOT NULL DEFAULT 'In Progress'
                CHECK (status IN ('Not Started','In Progress','On Hold','Completed','Cancelled')),
  utilization NUMERIC(6,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_employee ON tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project  ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_date     ON tasks(task_date);

-- ── Licenses ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS licenses (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(100) NOT NULL UNIQUE,
  price            NUMERIC(12,2) NOT NULL DEFAULT 0,
  description      TEXT,
  status           VARCHAR(20)  NOT NULL DEFAULT 'active',
  duration_months  INT,
  features         TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Customers ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id                 SERIAL PRIMARY KEY,
  name               VARCHAR(200) NOT NULL,
  email              VARCHAR(200),
  phone              VARCHAR(50),
  company            VARCHAR(200),
  license_id         INT REFERENCES licenses(id) ON DELETE SET NULL,
  license_start_date DATE,
  license_end_date   DATE,
  notes              TEXT,
  status             VARCHAR(20)  NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','inactive')),
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Customer Visits ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_visits (
  id               SERIAL PRIMARY KEY,
  customer_id      INT          NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_to      INT          REFERENCES employees(id) ON DELETE SET NULL,
  created_by       INT          REFERENCES employees(id) ON DELETE SET NULL,
  planned_date     DATE         NOT NULL,
  contact_person   VARCHAR(200),
  channel          VARCHAR(50)  NOT NULL DEFAULT 'Email'
                     CHECK (channel IN ('Email','WhatsApp','Phone Call','SMS','On-Site Request')),
  agenda           TEXT         NOT NULL DEFAULT '',
  duration         INT          NOT NULL DEFAULT 60,
  status           VARCHAR(30)  NOT NULL DEFAULT 'Planned'
                     CHECK (status IN ('Planned','In Progress','Completed','Pending','Rescheduled','Cancelled')),
  proof_file       VARCHAR(500),
  work_done        TEXT,
  issues_resolved  TEXT,
  additional_reqs  TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visits_customer    ON customer_visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_visits_assigned_to ON customer_visits(assigned_to);
CREATE INDEX IF NOT EXISTS idx_visits_date        ON customer_visits(planned_date);

-- ── System Settings ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  id                      SERIAL PRIMARY KEY,
  company_name            VARCHAR(200) NOT NULL DEFAULT 'My Company',
  daily_target_mins       INT          NOT NULL DEFAULT 510,
  work_days               VARCHAR(50)  NOT NULL DEFAULT 'Mon-Fri',
  timezone                VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
  tat_alert_days          INT          NOT NULL DEFAULT 2,
  email_notif             BOOLEAN      NOT NULL DEFAULT TRUE,
  auto_close              BOOLEAN      NOT NULL DEFAULT FALSE,
  session_timeout         INT          NOT NULL DEFAULT 0,
  admin_email             VARCHAR(200),
  visit_reminder_enabled  BOOLEAN      NOT NULL DEFAULT TRUE,
  work_categories         TEXT,
  work_formulas           TEXT
);

-- ── Library Sections ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_sections (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(200) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Library Videos ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_videos (
  id         SERIAL PRIMARY KEY,
  section_id INT          REFERENCES library_sections(id) ON DELETE CASCADE,
  label      VARCHAR(200) NOT NULL,
  caption    TEXT         NOT NULL DEFAULT '',
  video_id   VARCHAR(100) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Email Settings ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_settings (
  id            SERIAL PRIMARY KEY,
  from_email    VARCHAR(200),
  app_password  VARCHAR(500),
  is_configured BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Role Permissions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  id         SERIAL PRIMARY KEY,
  role_name  VARCHAR(50)  NOT NULL,
  page_key   VARCHAR(100) NOT NULL,
  can_view   BOOLEAN      NOT NULL DEFAULT FALSE,
  can_create BOOLEAN      NOT NULL DEFAULT FALSE,
  can_update BOOLEAN      NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN      NOT NULL DEFAULT FALSE,
  UNIQUE(role_name, page_key)
);

-- ── Seed: Email settings (empty placeholder row) ─────────────────────────
INSERT INTO email_settings (id, from_email, app_password, is_configured)
VALUES (1, NULL, NULL, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ── Seed: Core roles ─────────────────────────────────────────────────────
INSERT INTO roles (name, description) VALUES
  ('Admin',   'Full system access'),
  ('Manager', 'Department-level access'),
  ('User',    'Personal work log access')
ON CONFLICT (name) DO NOTHING;

-- ── Seed: System settings (single row) ───────────────────────────────────
INSERT INTO system_settings
  (id, company_name, daily_target_mins, work_days, timezone, tat_alert_days,
   email_notif, auto_close, session_timeout, admin_email, visit_reminder_enabled)
VALUES
  (1, 'MPulse', 510, 'Mon-Fri', 'Asia/Kolkata', 2, TRUE, FALSE, 0, NULL, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ── Seed: Default department ─────────────────────────────────────────────
INSERT INTO departments (name) VALUES ('Administration')
ON CONFLICT (name) DO NOTHING;

-- ── Seed: Default licenses ────────────────────────────────────────────────
INSERT INTO licenses (name, description) VALUES
  ('DigiSmart',       'DigiSmart module'),
  ('DigiSmart+VComp', 'DigiSmart bundled with VComp'),
  ('Digitalization',  'Full digitalization suite'),
  ('Gateway',         'Gateway integration module'),
  ('IIOT',            'Industrial IoT module'),
  ('Sandman',         'Sandman core module'),
  ('Sandman+VComp',   'Sandman bundled with VComp'),
  ('VComp-SP',        'VComp single product')
ON CONFLICT (name) DO NOTHING;

-- ── Seed: Admin user ─────────────────────────────────────────────────────
-- password: Admin@1234
INSERT INTO employees (name, email, password_hash, status, invite_status, role_id, department_id)
SELECT
  'Admin',
  'mpulsempm@gmail.com',
  '$2a$10$3.QRg0nFA6u4T8/tK5fAQeVYy.e.ilI7hcByj6RfJc6pQ7neQpk9C',
  'active',
  'accepted',
  r.id,
  d.id
FROM roles r, departments d
WHERE r.name = 'Admin' AND d.name = 'Administration'
ON CONFLICT (email) DO NOTHING;

-- ── Seed: Library section + videos ───────────────────────────────────────
DO $$
DECLARE
  sec_id INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM library_sections LIMIT 1) THEN
    INSERT INTO library_sections (title, sort_order)
    VALUES ('Green Sand Testing Videos', 0)
    RETURNING id INTO sec_id;

    INSERT INTO library_videos (section_id, label, caption, video_id, sort_order) VALUES
      (sec_id, 'Active Clay',         'DETERMINATION OF ACTIVE CLAY CONTENT IN SAND SAMPLE',          'ztfIlTmLMkc', 0),
      (sec_id, 'Loss on Ignition',    'DETERMINATION OF LOSS ON IGNITION IN THE GIVEN SAND SAMPLE',   'x9BoNmkYeHY', 1),
      (sec_id, 'Volatile Matter',     'DETERMINATION OF VOLATILE MATTER CONTENT IN SAND SAMPLE',      'C0DPdy98e4c', 2),
      (sec_id, 'Moisture',            'DETERMINATION OF MOISTURE CONTENT OF SAND SAMPLE',             'Ml4XCF-JS0o', 3),
      (sec_id, 'Total Clay',          'DETERMINATION OF TOTAL CLAY CONTENT IN THE GIVEN SAND SAMPLE', 'mP4BFzBnDN4', 4),
      (sec_id, 'pH of the Bentonite', 'DETERMINATION OF PH OF THE BENTONITE AND SAND SAMPLE',         'Wch3gJG2GJ4', 5);
  END IF;
END $$;

-- ── Seed: Default role permissions ───────────────────────────────────────
INSERT INTO role_permissions (role_name, page_key, can_view, can_create, can_update, can_delete) VALUES
  ('Admin','dashboard',     true,  true,  true,  true),
  ('Admin','worklog',       true,  true,  true,  true),
  ('Admin','visits',        true,  true,  true,  true),
  ('Admin','projects',      true,  true,  true,  true),
  ('Admin','masterdata',    true,  true,  true,  true),
  ('Admin','reports',       true,  true,  true,  true),
  ('Admin','admin',         true,  true,  true,  true),
  ('Admin','library',       true,  true,  true,  true),
  ('Admin','md_employees',  true,  true,  true,  true),
  ('Admin','md_departments',true,  true,  true,  true),
  ('Admin','md_roles',      true,  true,  true,  true),
  ('Admin','md_licenses',   true,  true,  true,  true),
  ('Admin','md_customers',  true,  true,  true,  true),
  ('Admin','md_emailconfig',true,  false, true,  false),
  ('Admin','md_accessconfig',true, false, true,  false),
  ('Admin','md_categories', true,  false, true,  false),
  ('Admin','_team_only',    false, false, false, false),
  ('Manager','dashboard',   true,  false, false, false),
  ('Manager','worklog',     true,  true,  true,  true),
  ('Manager','visits',      true,  true,  true,  false),
  ('Manager','projects',    true,  true,  true,  false),
  ('Manager','masterdata',  true,  false, false, false),
  ('Manager','reports',     true,  false, false, false),
  ('Manager','admin',       false, false, false, false),
  ('Manager','library',     true,  false, false, false),
  ('Manager','md_employees',true,  true,  true,  false),
  ('Manager','md_departments',false,false,false, false),
  ('Manager','md_roles',    false, false, false, false),
  ('Manager','md_licenses', false, false, false, false),
  ('Manager','md_customers',true,  true,  true,  false),
  ('Manager','md_emailconfig',false,false,false, false),
  ('Manager','md_accessconfig',false,false,false,false),
  ('Manager','md_categories',false,false,false,  false),
  ('Manager','_team_only',  true,  false, false, false),
  ('User','dashboard',      true,  false, false, false),
  ('User','worklog',        true,  true,  true,  true),
  ('User','visits',         false, false, false, false),
  ('User','projects',       true,  false, false, false),
  ('User','masterdata',     false, false, false, false),
  ('User','reports',        false, false, false, false),
  ('User','admin',          false, false, false, false),
  ('User','library',        true,  false, false, false),
  ('User','md_employees',   false, false, false, false),
  ('User','md_departments', false, false, false, false),
  ('User','md_roles',       false, false, false, false),
  ('User','md_licenses',    false, false, false, false),
  ('User','md_customers',   false, false, false, false),
  ('User','md_emailconfig', false, false, false, false),
  ('User','md_accessconfig',false, false, false, false),
  ('User','md_categories',  false, false, false, false),
  ('User','_team_only',     false, false, false, false)
ON CONFLICT (role_name, page_key) DO NOTHING;

-- ── Backfill: tasks columns added after initial deploy ────────────────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS visit_id    INT REFERENCES customer_visits(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_visit ON tasks(visit_id);
