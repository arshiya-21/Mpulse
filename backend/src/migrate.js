const db = require('./config/db');

module.exports = async function migrate() {
  console.log('🔄 Running migrations...');
  try {
    // ── Core tables (safe on fresh DB — CREATE IF NOT EXISTS) ─────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS roles (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(50)  NOT NULL UNIQUE,
        description TEXT,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS employees (
        id                      SERIAL PRIMARY KEY,
        name                    VARCHAR(200) NOT NULL,
        email                   VARCHAR(200) NOT NULL UNIQUE,
        password_hash           VARCHAR(255),
        status                  VARCHAR(20)  NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active','inactive')),
        invite_status           VARCHAR(20)  NOT NULL DEFAULT 'accepted'
                                  CHECK (invite_status IN ('pending','accepted','reset_requested')),
        department_id           INT REFERENCES departments(id) ON DELETE SET NULL,
        secondary_department_id INT REFERENCES departments(id) ON DELETE SET NULL,
        role_id                 INT REFERENCES roles(id) ON DELETE SET NULL,
        manager_id              INT REFERENCES employees(id) ON DELETE SET NULL,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS licenses (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) NOT NULL UNIQUE,
        price       NUMERIC(12,2) NOT NULL DEFAULT 0,
        description TEXT,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

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
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_employee ON tasks(employee_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_project  ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_date     ON tasks(task_date);

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

      INSERT INTO system_settings
        (id, company_name, daily_target_mins, work_days, timezone, tat_alert_days,
         email_notif, auto_close, session_timeout, admin_email, visit_reminder_enabled)
      VALUES
        (1, 'MPulse', 510, 'Mon-Fri', 'Asia/Kolkata', 2, TRUE, FALSE, 0, NULL, TRUE)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Core tables ready');

    // ── Multi-manager support ──────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS employee_managers (
        employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        manager_id  INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        PRIMARY KEY (employee_id, manager_id)
      );
      CREATE INDEX IF NOT EXISTS idx_emp_mgr_employee ON employee_managers(employee_id);
      CREATE INDEX IF NOT EXISTS idx_emp_mgr_manager  ON employee_managers(manager_id);
    `);

    // Migrate existing manager_id → employee_managers (one-time backfill, safe to re-run)
    await db.query(`
      INSERT INTO employee_managers (employee_id, manager_id)
      SELECT id, manager_id FROM employees
      WHERE manager_id IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ employee_managers table ready');

    await db.query(`
      CREATE TABLE IF NOT EXISTS library_sections (
        id         SERIAL PRIMARY KEY,
        title      VARCHAR(200) NOT NULL,
        sort_order INT          NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

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
    `);

    // Seed default library section + videos if empty
    const { rows: sections } = await db.query('SELECT id FROM library_sections LIMIT 1');
    if (sections.length === 0) {
      const { rows: [sec] } = await db.query(
        "INSERT INTO library_sections (title, sort_order) VALUES ('Green Sand Testing Videos', 0) RETURNING id"
      );
      await db.query(`
        INSERT INTO library_videos (section_id, label, caption, video_id, sort_order) VALUES
          ($1,'Active Clay',        'DETERMINATION OF ACTIVE CLAY CONTENT IN SAND SAMPLE',          'ztfIlTmLMkc',0),
          ($1,'Loss on Ignition',   'DETERMINATION OF LOSS ON IGNITION IN THE GIVEN SAND SAMPLE',   'x9BoNmkYeHY',1),
          ($1,'Volatile Matter',    'DETERMINATION OF VOLATILE MATTER CONTENT IN SAND SAMPLE',      'C0DPdy98e4c',2),
          ($1,'Moisture',           'DETERMINATION OF MOISTURE CONTENT OF SAND SAMPLE',             'Ml4XCF-JS0o',3),
          ($1,'Total Clay',         'DETERMINATION OF TOTAL CLAY CONTENT IN THE GIVEN SAND SAMPLE', 'mP4BFzBnDN4',4),
          ($1,'pH of the Bentonite','DETERMINATION OF PH OF THE BENTONITE AND SAND SAMPLE',         'Wch3gJG2GJ4',5)
      `, [sec.id]);
      console.log('✅ Library seeded');
    }

    // Seed default role permissions — always runs so missing keys are filled in
    // ON CONFLICT DO NOTHING ensures existing customisations are never overwritten
    await db.query(`
      INSERT INTO role_permissions (role_name,page_key,can_view,can_create,can_update,can_delete) VALUES
      ('Admin','dashboard',true,true,true,true),('Admin','worklog',true,true,true,true),
      ('Admin','visits',true,true,true,true),('Admin','projects',true,true,true,true),
      ('Admin','masterdata',true,true,true,true),('Admin','reports',true,true,true,true),
      ('Admin','admin',true,true,true,true),('Admin','library',true,true,true,true),
      ('Admin','md_employees',true,true,true,true),('Admin','md_departments',true,true,true,true),
      ('Admin','md_roles',true,true,true,true),('Admin','md_licenses',true,true,true,true),
      ('Admin','md_customers',true,true,true,true),('Admin','md_emailconfig',true,false,true,false),
      ('Admin','md_accessconfig',true,false,true,false),('Admin','md_categories',true,false,true,false),('Admin','_team_only',false,false,false,false),
      ('Manager','dashboard',true,false,false,false),('Manager','worklog',true,true,true,true),
      ('Manager','visits',true,true,true,false),('Manager','projects',true,true,true,false),
      ('Manager','masterdata',true,false,false,false),('Manager','reports',true,false,false,false),
      ('Manager','admin',false,false,false,false),('Manager','library',true,false,false,false),
      ('Manager','md_employees',true,true,true,false),('Manager','md_departments',false,false,false,false),
      ('Manager','md_roles',false,false,false,false),('Manager','md_licenses',false,false,false,false),
      ('Manager','md_customers',true,true,true,false),('Manager','md_emailconfig',false,false,false,false),
      ('Manager','md_accessconfig',false,false,false,false),('Manager','md_categories',false,false,false,false),('Manager','_team_only',true,false,false,false),
      ('User','dashboard',true,false,false,false),('User','worklog',true,true,true,true),
      ('User','visits',false,false,false,false),('User','projects',true,false,false,false),
      ('User','masterdata',false,false,false,false),('User','reports',false,false,false,false),
      ('User','admin',false,false,false,false),('User','library',true,false,false,false),
      ('User','md_employees',false,false,false,false),('User','md_departments',false,false,false,false),
      ('User','md_roles',false,false,false,false),('User','md_licenses',false,false,false,false),
      ('User','md_customers',false,false,false,false),('User','md_emailconfig',false,false,false,false),
      ('User','md_accessconfig',false,false,false,false),('User','md_categories',false,false,false,false),('User','_team_only',false,false,false,false)
      ON CONFLICT (role_name,page_key) DO NOTHING
    `);
    console.log('✅ Default permissions seeded (missing rows filled in)');

    // ── Fix overly-permissive Manager defaults from earlier versions ──────────
    // Only resets records that still hold the old wrong values (never been customised).
    // dashboard: was erroneously seeded with create/update/delete = true
    await db.query(`
      UPDATE role_permissions
      SET can_create = false, can_update = false, can_delete = false
      WHERE role_name = 'Manager' AND page_key = 'dashboard'
        AND can_create = true AND can_update = true AND can_delete = true
    `);
    // visits/projects: delete was erroneously true
    await db.query(`
      UPDATE role_permissions
      SET can_delete = false
      WHERE role_name = 'Manager' AND page_key IN ('visits','projects')
        AND can_delete = true AND can_create = true AND can_update = true
    `);
    console.log('✅ Manager default permissions corrected');

    // ── email_settings table ──────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_settings (
        id            SERIAL PRIMARY KEY,
        from_email    VARCHAR(200),
        app_password  VARCHAR(500),
        is_configured BOOLEAN     NOT NULL DEFAULT FALSE,
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    // Add missing columns and ensure from_email/app_password are nullable
    await db.query(`
      ALTER TABLE email_settings
        ADD COLUMN IF NOT EXISTS is_configured BOOLEAN     NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();
    `);
    await db.query(`
      ALTER TABLE email_settings
        ALTER COLUMN from_email   DROP NOT NULL,
        ALTER COLUMN app_password DROP NOT NULL;
    `);
    await db.query(`
      INSERT INTO email_settings (id, from_email, app_password, is_configured)
      VALUES (1, NULL, NULL, FALSE)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ email_settings table ready');

    // ── Default licenses ──────────────────────────────────────────────
    await db.query(`
      INSERT INTO licenses (name, description) VALUES
        ('DigiSmart',       'DigiSmart module'),
        ('DigiSmart+VComp', 'DigiSmart bundled with VComp'),
        ('Digitalization',  'Full digitalization suite'),
        ('Gateway',         'Gateway integration module'),
        ('IIOT',            'Industrial IoT module'),
        ('Sandman',         'Sandman core module'),
        ('Sandman+VComp',   'Sandman bundled with VComp'),
        ('VComp-SP',        'VComp single product')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Default licenses ready');

    // ── departments: add status column ───────────────────────────────
    await db.query(`
      ALTER TABLE departments
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
    `);

    // ── customers: add license date columns ───────────────────────────
    await db.query(`
      ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS license_start_date DATE,
        ADD COLUMN IF NOT EXISTS license_end_date   DATE;
    `);

    // ── employees: add invite_token + invite_expires columns ─────
    await db.query(`
      ALTER TABLE employees
        ADD COLUMN IF NOT EXISTS invite_token   TEXT,
        ADD COLUMN IF NOT EXISTS invite_expires TIMESTAMPTZ;
    `);

    // ── Add admin_email + visit_reminder_enabled to system_settings ──
    await db.query(`
      ALTER TABLE system_settings
        ADD COLUMN IF NOT EXISTS admin_email            VARCHAR(200),
        ADD COLUMN IF NOT EXISTS visit_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS work_categories        TEXT,
        ADD COLUMN IF NOT EXISTS work_formulas          TEXT;
    `);

    // ── Add closed_at + owner_id to projects ─────────────────────
    await db.query(`
      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS owner_id  INT REFERENCES employees(id) ON DELETE SET NULL;
    `);

    // ── Add is_recurring to projects (separate statement so it always runs) ──
    await db.query(`
      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    // ── Add description to tasks ──────────────────────────────────────────
    await db.query(`
      ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS description TEXT;
    `);

    // ── Add worklog_digest_enabled to system_settings ─────────────────────
    await db.query(`
      ALTER TABLE system_settings
        ADD COLUMN IF NOT EXISTS worklog_digest_enabled BOOLEAN NOT NULL DEFAULT TRUE;
    `);

    // ── Add visit_id to tasks (links auto-created visit work logs) ─────────
    await db.query(`
      ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS visit_id INT REFERENCES customer_visits(id) ON DELETE SET NULL;
    `);

    // ── project_assignees table ───────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS project_assignees (
        project_id  INT NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
        employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        PRIMARY KEY (project_id, employee_id)
      );
      CREATE INDEX IF NOT EXISTS idx_proj_assignees_project  ON project_assignees(project_id);
      CREATE INDEX IF NOT EXISTS idx_proj_assignees_employee ON project_assignees(employee_id);
    `);
    console.log('✅ projects columns + project_assignees table ready');

    // ── customer_visits: change duration from INT to VARCHAR ─────
    await db.query(`
      ALTER TABLE customer_visits
        ALTER COLUMN duration TYPE VARCHAR(100) USING duration::text;
    `);

    // ── licenses: add missing columns ────────────────────────────
    await db.query(`
      ALTER TABLE licenses
        ADD COLUMN IF NOT EXISTS status           VARCHAR(20)  NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS duration_months  INT,
        ADD COLUMN IF NOT EXISTS features         TEXT,
        ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW();
    `);
    console.log('✅ licenses columns ready');

    // ── Fix library_videos: extract YouTube ID from full URLs ──
    // Some video_ids may have been saved as full YouTube URLs
    const { rows: badVideos } = await db.query(`
      SELECT id, video_id FROM library_videos
      WHERE video_id LIKE '%youtube%' OR video_id LIKE '%youtu.be%' OR video_id LIKE 'http%'
    `);
    for (const vid of badVideos) {
      const match = vid.video_id.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
      if (match) {
        await db.query('UPDATE library_videos SET video_id = $1 WHERE id = $2', [match[1], vid.id]);
        console.log(`✅ Fixed video_id for library_videos id=${vid.id}: ${vid.video_id} → ${match[1]}`);
      }
    }

    // ── Fix projects.status CHECK constraint to include all valid statuses ───
    // Drop first so legacy values ('Open') can be migrated without violating old constraint
    await db.query(`ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check`);
    await db.query(`UPDATE projects SET status = 'Not Started' WHERE status = 'Open'`);
    await db.query(`
      UPDATE projects SET status = 'In Progress'
        WHERE status NOT IN ('Not Started','In Progress','On Hold','Completed','Cancelled','Closed')
    `);
    await db.query(`
      ALTER TABLE projects ADD CONSTRAINT projects_status_check
        CHECK (status IN ('Not Started','In Progress','On Hold','Completed','Cancelled','Closed'))
    `);
    console.log('✅ projects.status CHECK constraint updated');

    await db.query(`
      ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_invite_status_check;
      ALTER TABLE employees ADD CONSTRAINT employees_invite_status_check
        CHECK (invite_status IN ('pending','accepted','reset_requested'));
    `);
    console.log('✅ employees.invite_status CHECK constraint updated');

    // ── project_meetings ─────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS project_meetings (
        id               SERIAL PRIMARY KEY,
        project_id       INT  NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        schedule_type    VARCHAR(10) NOT NULL DEFAULT 'Daily',
        days             TEXT NOT NULL DEFAULT '',
        meeting_time     TIME NOT NULL,
        reminder_mins    INT  NOT NULL DEFAULT 30,
        meeting_link     TEXT NOT NULL,
        last_reminded_at TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ project_meetings table ready');

    // ── Asset Management ─────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS asset_types (
        name VARCHAR(100) PRIMARY KEY,
        icon VARCHAR(20) NOT NULL
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id         VARCHAR(20) PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        code       VARCHAR(100),
        type       VARCHAR(100) NOT NULL,
        brand      VARCHAR(100),
        model      VARCHAR(100),
        condition  VARCHAR(20)   DEFAULT 'Good',
        purchased  DATE,
        warranty   DATE,
        cost       NUMERIC(12,2) DEFAULT 0,
        vendor     VARCHAR(255),
        status     VARCHAR(30)   DEFAULT 'Available',
        assignee   VARCHAR(255),
        department VARCHAR(100),
        location   VARCHAR(255),
        notes      TEXT,
        created_at TIMESTAMP     DEFAULT NOW(),
        updated_at TIMESTAMP     DEFAULT NOW()
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS asset_transfers (
        id             SERIAL PRIMARY KEY,
        asset_id       VARCHAR(20) NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        from_employee  VARCHAR(255),
        to_employee    VARCHAR(255) NOT NULL,
        transfer_date  DATE        NOT NULL,
        reason         TEXT,
        transferred_by VARCHAR(255) DEFAULT 'Admin',
        created_at     TIMESTAMP   DEFAULT NOW()
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS asset_service_logs (
        id           SERIAL PRIMARY KEY,
        asset_id     VARCHAR(20) NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        service_date DATE        NOT NULL,
        issue        TEXT        NOT NULL,
        action_taken TEXT,
        serviced_by  VARCHAR(255),
        cost         NUMERIC(12,2) DEFAULT 0,
        created_at   TIMESTAMP     DEFAULT NOW()
      );
    `);
    console.log('✅ asset tables ready');

    // ── Announcements ─────────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id         SERIAL PRIMARY KEY,
        title      VARCHAR(255) NOT NULL,
        message    TEXT         NOT NULL,
        type       VARCHAR(30)  DEFAULT 'update',
        created_by VARCHAR(255),
        created_at TIMESTAMP    DEFAULT NOW()
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS announcement_reads (
        user_id         INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
        read_at         TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, announcement_id)
      );
    `);
    console.log('✅ announcement tables ready');

    // ── Inventory Management ─────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id         SERIAL PRIMARY KEY,
        code       VARCHAR(20) UNIQUE NOT NULL,
        name       VARCHAR(255) NOT NULL,
        category   VARCHAR(100) NOT NULL,
        unit       VARCHAR(50) NOT NULL,
        stock      INTEGER NOT NULL DEFAULT 0,
        min_stock  INTEGER NOT NULL DEFAULT 0,
        cost       NUMERIC(12,2) NOT NULL DEFAULT 0,
        sell_price NUMERIC(12,2) NOT NULL DEFAULT 0,
        supplier   VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory_suppliers (
        id             SERIAL PRIMARY KEY,
        name           VARCHAR(255) UNIQUE NOT NULL,
        contact_person VARCHAR(255),
        phone          VARCHAR(30),
        email          VARCHAR(255),
        city           VARCHAR(100),
        items_supplied VARCHAR(255),
        notes          TEXT,
        created_at     TIMESTAMP DEFAULT NOW(),
        updated_at     TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory_inward (
        id           SERIAL PRIMARY KEY,
        grn_number   VARCHAR(20) UNIQUE NOT NULL,
        date         DATE NOT NULL,
        supplier_id  INTEGER REFERENCES inventory_suppliers(id),
        invoice_no   VARCHAR(100),
        received_by  VARCHAR(255),
        status       VARCHAR(20) NOT NULL DEFAULT 'Pending',
        notes        TEXT,
        total_value  NUMERIC(12,2) NOT NULL DEFAULT 0,
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory_inward_items (
        id         SERIAL PRIMARY KEY,
        inward_id  INTEGER NOT NULL REFERENCES inventory_inward(id) ON DELETE CASCADE,
        item_id    INTEGER REFERENCES inventory_items(id),
        item_name  VARCHAR(255) NOT NULL,
        unit_cost  NUMERIC(12,2) NOT NULL DEFAULT 0,
        qty        INTEGER NOT NULL DEFAULT 1,
        line_total NUMERIC(12,2) GENERATED ALWAYS AS (unit_cost * qty) STORED
      );

      CREATE TABLE IF NOT EXISTS inventory_outward (
        id             SERIAL PRIMARY KEY,
        dn_number      VARCHAR(20) UNIQUE NOT NULL,
        date           DATE NOT NULL,
        customer_name  VARCHAR(255) NOT NULL,
        order_ref      VARCHAR(100),
        dispatched_by  VARCHAR(255),
        status         VARCHAR(20) NOT NULL DEFAULT 'Pending',
        notes          TEXT,
        total_value    NUMERIC(12,2) NOT NULL DEFAULT 0,
        created_at     TIMESTAMP DEFAULT NOW(),
        updated_at     TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory_outward_items (
        id          SERIAL PRIMARY KEY,
        outward_id  INTEGER NOT NULL REFERENCES inventory_outward(id) ON DELETE CASCADE,
        item_id     INTEGER REFERENCES inventory_items(id),
        item_name   VARCHAR(255) NOT NULL,
        unit_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
        qty         INTEGER NOT NULL DEFAULT 1,
        line_total  NUMERIC(12,2) GENERATED ALWAYS AS (unit_price * qty) STORED
      );

      CREATE INDEX IF NOT EXISTS idx_inward_items_inward_id   ON inventory_inward_items(inward_id);
      CREATE INDEX IF NOT EXISTS idx_outward_items_outward_id ON inventory_outward_items(outward_id);
      CREATE INDEX IF NOT EXISTS idx_items_category           ON inventory_items(category);
    `);
    console.log('✅ inventory tables ready');

    // ── Marketing Hub: Leads ─────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS marketing_lead_sources (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS marketing_products (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS marketing_business_areas (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS marketing_foundry_types (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS marketing_sand_types (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS marketing_demo_types (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS marketing_product_phases (
        id           SERIAL PRIMARY KEY,
        product_id   INT NOT NULL REFERENCES marketing_products(id) ON DELETE CASCADE,
        phase_number INT NOT NULL,
        title        VARCHAR(200) NOT NULL,
        weeks        VARCHAR(50),
        description  TEXT,
        steps        TEXT[]      NOT NULL DEFAULT '{}',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(product_id, phase_number)
      );
      CREATE INDEX IF NOT EXISTS idx_product_phases_product ON marketing_product_phases(product_id);

      CREATE TABLE IF NOT EXISTS marketing_leads (
        id                 SERIAL PRIMARY KEY,
        lead_no            VARCHAR(20)  UNIQUE NOT NULL,
        foundry_name       VARCHAR(200) NOT NULL,
        lead_source_id     INT REFERENCES marketing_lead_sources(id) ON DELETE SET NULL,
        contact_first_name VARCHAR(100),
        contact_last_name  VARCHAR(100),
        country            VARCHAR(100),
        street             TEXT,
        email              VARCHAR(200),
        city               VARCHAR(100),
        phone              VARCHAR(50),
        zip                VARCHAR(20),
        state              VARCHAR(100),
        designation        VARCHAR(100),
        status             VARCHAR(30)  NOT NULL DEFAULT 'Not Started'
                             CHECK (status IN ('Not Started','Follow Up','On Hold','Converted')),
        region             VARCHAR(100),
        business_area      VARCHAR(100),
        customer_potential TEXT[]       NOT NULL DEFAULT '{}',
        foundry_info       TEXT[]       NOT NULL DEFAULT '{}',
        sand_types         TEXT[]       NOT NULL DEFAULT '{}',
        mixer_make         VARCHAR(100),
        mixer_type         VARCHAR(100),
        mixer_batch_size   VARCHAR(50),
        hourly_sand_output VARCHAR(50),
        pain_points        TEXT,
        owner              VARCHAR(200),
        created_date       DATE         NOT NULL DEFAULT CURRENT_DATE,
        last_modified       DATE         NOT NULL DEFAULT CURRENT_DATE,
        created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_marketing_leads_status      ON marketing_leads(status);
      CREATE INDEX IF NOT EXISTS idx_marketing_leads_source      ON marketing_leads(lead_source_id);

      CREATE TABLE IF NOT EXISTS marketing_orders (
        id              SERIAL PRIMARY KEY,
        order_no        VARCHAR(20)   UNIQUE NOT NULL,
        customer        VARCHAR(200)  NOT NULL,
        product         VARCHAR(100)  NOT NULL,
        order_date      DATE          NOT NULL,
        value           NUMERIC(14,2) NOT NULL DEFAULT 0,
        paid            NUMERIC(14,2) NOT NULL DEFAULT 0,
        outstanding     NUMERIC(14,2) NOT NULL DEFAULT 0,
        payment_progress VARCHAR(20)  NOT NULL DEFAULT 'Pending'
                          CHECK (payment_progress IN ('Paid','Partial','Pending')),
        po_no           VARCHAR(100),
        po_uploaded     BOOLEAN       NOT NULL DEFAULT FALSE,
        order_status    VARCHAR(30)   NOT NULL DEFAULT 'Draft'
                          CHECK (order_status IN ('Draft','Confirmed','PO Received','Invoiced','Payment Done','Active (Go-Live)','Cancelled')),
        payment_status  VARCHAR(30)   NOT NULL DEFAULT 'Pending'
                          CHECK (payment_status IN ('Pending','Advance Paid','Fully Paid')),
        assigned_to     VARCHAR(200),
        created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
      ALTER TABLE marketing_orders
        ADD COLUMN IF NOT EXISTS po_document_url TEXT,
        ADD COLUMN IF NOT EXISTS po_document_name VARCHAR(255);
      CREATE INDEX IF NOT EXISTS idx_marketing_orders_status ON marketing_orders(order_status);

      CREATE TABLE IF NOT EXISTS marketing_implementation_progress (
        id                 SERIAL PRIMARY KEY,
        order_id           INT NOT NULL REFERENCES marketing_orders(id) ON DELETE CASCADE,
        phase_number       INT NOT NULL,
        status             VARCHAR(30) NOT NULL DEFAULT 'Not Started'
                             CHECK (status IN ('Not Started','In Progress','Completed','On Hold')),
        done_steps         BOOLEAN[]   NOT NULL DEFAULT '{}',
        start_date         DATE,
        end_date           DATE,
        responsible_person VARCHAR(200),
        notes              TEXT,
        documents          TEXT[]      NOT NULL DEFAULT '{}',
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(order_id, phase_number)
      );
      CREATE INDEX IF NOT EXISTS idx_impl_progress_order ON marketing_implementation_progress(order_id);

      CREATE TABLE IF NOT EXISTS marketing_renewals (
        id             SERIAL PRIMARY KEY,
        renewal_no     VARCHAR(20)   UNIQUE NOT NULL,
        order_id       INT REFERENCES marketing_orders(id) ON DELETE SET NULL,
        customer       VARCHAR(200)  NOT NULL,
        product        VARCHAR(100)  NOT NULL,
        license        VARCHAR(100),
        users          INT,
        contract_start DATE,
        contract_end   DATE,
        value          NUMERIC(14,2) NOT NULL DEFAULT 0,
        assigned_to    VARCHAR(200),
        notes          TEXT,
        renewal_status VARCHAR(20)   NOT NULL DEFAULT 'Active'
                         CHECK (renewal_status IN ('Active','Renewed','Churned')),
        created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS marketing_renewal_history (
        id             SERIAL PRIMARY KEY,
        renewal_id     INT NOT NULL REFERENCES marketing_renewals(id) ON DELETE CASCADE,
        renewed_on     DATE          NOT NULL,
        contract_start DATE,
        contract_end   DATE,
        value          NUMERIC(14,2) NOT NULL DEFAULT 0,
        status         VARCHAR(30)   NOT NULL DEFAULT 'Renewed',
        notes          TEXT,
        created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_renewal_history_renewal ON marketing_renewal_history(renewal_id);

      CREATE TABLE IF NOT EXISTS motivational_quotes (
        id         SERIAL PRIMARY KEY,
        text       TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS motivational_quote_settings (
        id             INT PRIMARY KEY DEFAULT 1,
        enabled        BOOLEAN NOT NULL DEFAULT TRUE,
        send_time      VARCHAR(5) NOT NULL DEFAULT '09:00',
        current_cycle  INT NOT NULL DEFAULT 1,
        last_sent_date DATE,
        last_quote_id  INT REFERENCES motivational_quotes(id) ON DELETE SET NULL,
        CHECK (id = 1)
      );
      INSERT INTO motivational_quote_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

      CREATE TABLE IF NOT EXISTS motivational_quote_log (
        id         SERIAL PRIMARY KEY,
        quote_id   INT NOT NULL REFERENCES motivational_quotes(id) ON DELETE CASCADE,
        cycle      INT NOT NULL,
        sent_date  DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_quote_log_cycle ON motivational_quote_log(cycle);

      ALTER TABLE employees
        ADD COLUMN IF NOT EXISTS receives_daily_quote BOOLEAN NOT NULL DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS marketing_demos (
        id              SERIAL PRIMARY KEY,
        demo_no         VARCHAR(20)  UNIQUE NOT NULL,
        customer        VARCHAR(200) NOT NULL,
        contact_person  VARCHAR(200),
        product         VARCHAR(200) NOT NULL,
        demo_date       DATE         NOT NULL,
        type            VARCHAR(50),
        conducted_by    VARCHAR(200),
        status          VARCHAR(30)  NOT NULL DEFAULT 'Requested'
                          CHECK (status IN ('Requested','Scheduled','Completed','Follow-Up','Converted to Order','Cancelled')),
        next_follow_up  DATE,
        created_date    DATE         NOT NULL DEFAULT CURRENT_DATE,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_marketing_demos_status ON marketing_demos(status);

      CREATE TABLE IF NOT EXISTS marketing_demo_activities (
        id             SERIAL PRIMARY KEY,
        demo_id        INT NOT NULL REFERENCES marketing_demos(id) ON DELETE CASCADE,
        activity_date  DATE NOT NULL,
        outcome        VARCHAR(30),
        next_follow_up DATE,
        note           TEXT,
        logged_by      VARCHAR(200),
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_demo_activities_demo ON marketing_demo_activities(demo_id);
    `);

    // Seed default lead sources + products (only if empty, so admin edits/deletes are never overwritten)
    await db.query(`
      INSERT INTO marketing_lead_sources (name) VALUES
        ('Trade Fair'),('Google Ads'),('LinkedIn'),('Email Campaign'),
        ('Referral'),('Cold Call'),('Website'),('Webinar'),('Social Media')
      ON CONFLICT (name) DO NOTHING;
    `);
    await db.query(`
      INSERT INTO marketing_products (name) VALUES
        ('Sandman'),('Sandman +VComp'),('DigiSmart'),('Gateway'),('Energy Analytics')
      ON CONFLICT (name) DO NOTHING;
    `);
    await db.query(`
      INSERT INTO marketing_business_areas (name) VALUES
        ('Automotive'),('Heavy Engineering'),('Railways'),('Defence'),
        ('General Engineering'),('Pipe Fittings'),('Pumps & Valves')
      ON CONFLICT (name) DO NOTHING;
    `);
    await db.query(`
      INSERT INTO marketing_foundry_types (name) VALUES
        ('Steel'),('Automotive'),('Cast Iron'),('Railway'),
        ('Other Metal'),('Machinery'),('DI Pipe'),('Sanitary / Municipal')
      ON CONFLICT (name) DO NOTHING;
    `);
    await db.query(`
      INSERT INTO marketing_sand_types (name) VALUES
        ('Green Sand'),('Alphaset Sand'),('No-Bake Sand'),('Lost Foam Sand'),('Permanent Mould Sand')
      ON CONFLICT (name) DO NOTHING;
    `);
    await db.query(`
      INSERT INTO marketing_demo_types (name) VALUES
        ('On-Site'),('Online'),('Virtual')
      ON CONFLICT (name) DO NOTHING;
    `);
    await db.query(`
      INSERT INTO marketing_product_phases (product_id, phase_number, title, weeks, description, steps)
      SELECT id, 0, 'Phase 0: Kickoff', NULL, 'Start → SandMan Proposal → Receipt of PO → SandMan Data Audit',
        ARRAY['Start','SandMan Proposal shared with customer','PO received from customer','SandMan Data Audit completed','Kickoff meeting scheduled']
      FROM marketing_products WHERE name='Sandman'
      ON CONFLICT (product_id, phase_number) DO NOTHING;
    `);
    await db.query(`
      INSERT INTO marketing_product_phases (product_id, phase_number, title, weeks, description, steps)
      SELECT id, 1, 'Phase 1: Data Collection', '4–6 Weeks', 'Virtual Kickoff Meeting · Data collection (Historical 6 months + SCADA handshaking)',
        ARRAY['Virtual Kickoff Meeting','Data collection - Historical 6 months','SCADA handshaking','Sensor mapping','Baseline report','Data cleanup','QA pass 1','QA pass 2','Client review call','Sign-off doc drafted','Sign-off doc signed','Handover to analysis team']
      FROM marketing_products WHERE name='Sandman'
      ON CONFLICT (product_id, phase_number) DO NOTHING;
    `);
    await db.query(`
      INSERT INTO marketing_product_phases (product_id, phase_number, title, weeks, description, steps)
      SELECT id, 2, 'Phase 2: Analysis & Modelling', '4–5 Weeks', 'Documentation · Data Analysis Modelling · Data Science Team Review · Data Validation Checklist',
        ARRAY['Documentation','Data Analysis Modelling','Data Science Team Review','Data Validation Checklist','Final model sign-off']
      FROM marketing_products WHERE name='Sandman'
      ON CONFLICT (product_id, phase_number) DO NOTHING;
    `);
    await db.query(`
      INSERT INTO marketing_product_phases (product_id, phase_number, title, weeks, description, steps)
      SELECT id, 3, 'Phase 3: Go-Live', '1–2 Weeks', 'Sandmix Implementation · Virtual Meeting · Sign Off',
        ARRAY['Sandmix Implementation','Virtual Meeting','Sign Off','Post go-live support call','Handover to CS team','Training session','Documentation delivered','Final closure']
      FROM marketing_products WHERE name='Sandman'
      ON CONFLICT (product_id, phase_number) DO NOTHING;
    `);
    console.log('✅ marketing_leads tables ready');

    console.log('✅ Migrations complete');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  }
};
