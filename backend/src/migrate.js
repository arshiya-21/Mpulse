const db = require('./config/db');

module.exports = async function migrate() {
  console.log('🔄 Running migrations...');
  try {
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

    // ── Add admin_email + visit_reminder_enabled to system_settings ──
    await db.query(`
      ALTER TABLE system_settings
        ADD COLUMN IF NOT EXISTS admin_email            VARCHAR(200),
        ADD COLUMN IF NOT EXISTS visit_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS work_categories        TEXT;
    `);

    // ── Add closed_at to projects ─────────────────────────────
    await db.query(`
      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
    `);
    console.log('✅ system_settings columns ready');

    console.log('✅ Migrations complete');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  }
};
