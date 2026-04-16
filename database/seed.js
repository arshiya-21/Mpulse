/**
 * database/seed.js
 * Creates / updates the admin user in the database.
 * Run with: node database/seed.js
 *
 * Default credentials:
 *   Email:    admin@mpulse.com
 *   Password: Admin@1234
 */

const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://tracker_user:tracker_pass_123@localhost:5432/task_tracker',
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting seed…');

    // Ensure core roles exist
    await client.query(`
      INSERT INTO roles (name, description) VALUES
        ('Admin',   'Full system access'),
        ('Manager', 'Department-level access'),
        ('User',    'Personal work log access')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Roles ready');

    // Ensure Administration department exists
    await client.query(`
      INSERT INTO departments (name) VALUES ('Administration')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Departments ready');

    // Ensure system settings row exists
    await client.query(`
      INSERT INTO system_settings
        (id, company_name, daily_target_mins, work_days, timezone,
         tat_alert_days, email_notif, auto_close, session_timeout,
         admin_email, visit_reminder_enabled)
      VALUES
        (1, 'MPulse', 510, 'Mon-Fri', 'Asia/Kolkata', 2, TRUE, FALSE, 30, NULL, TRUE)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ System settings ready');

    // Get Admin role id + Administration dept id
    const { rows: roleRows } = await client.query(
      "SELECT id FROM roles WHERE name = 'Admin' LIMIT 1"
    );
    const { rows: deptRows } = await client.query(
      "SELECT id FROM departments WHERE name = 'Administration' LIMIT 1"
    );

    if (!roleRows[0] || !deptRows[0]) {
      throw new Error('Could not find Admin role or Administration department');
    }

    const roleId = roleRows[0].id;
    const deptId = deptRows[0].id;

    // Hash password
    const passwordHash = await bcrypt.hash('Admin@1234', 10);

    // Upsert admin user
    await client.query(`
      INSERT INTO employees
        (name, email, password_hash, status, invite_status, role_id, department_id)
      VALUES
        ($1, $2, $3, 'active', 'accepted', $4, $5)
      ON CONFLICT (email) DO UPDATE SET
        name          = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        status        = 'active',
        invite_status = 'accepted',
        role_id       = EXCLUDED.role_id,
        department_id = EXCLUDED.department_id,
        updated_at    = NOW()
    `, ['Admin', 'admin@mpulse.com', passwordHash, roleId, deptId]);

    console.log('✅ Admin user ready');
    console.log('');
    console.log('  Email:    admin@mpulse.com');
    console.log('  Password: Admin@1234');
    console.log('');

    // Ensure email_settings placeholder row exists
    await client.query(`
      INSERT INTO email_settings (id, from_email, app_password, is_configured)
      VALUES (1, NULL, NULL, FALSE)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Email settings ready');

    // Seed library section + videos if empty
    const { rows: libRows } = await client.query('SELECT id FROM library_sections LIMIT 1');
    if (libRows.length === 0) {
      const { rows: [sec] } = await client.query(
        "INSERT INTO library_sections (title, sort_order) VALUES ('Green Sand Testing Videos', 0) RETURNING id"
      );
      await client.query(`
        INSERT INTO library_videos (section_id, label, caption, video_id, sort_order) VALUES
          ($1,'Active Clay',         'DETERMINATION OF ACTIVE CLAY CONTENT IN SAND SAMPLE',          'ztfIlTmLMkc',0),
          ($1,'Loss on Ignition',    'DETERMINATION OF LOSS ON IGNITION IN THE GIVEN SAND SAMPLE',   'x9BoNmkYeHY',1),
          ($1,'Volatile Matter',     'DETERMINATION OF VOLATILE MATTER CONTENT IN SAND SAMPLE',      'C0DPdy98e4c',2),
          ($1,'Moisture',            'DETERMINATION OF MOISTURE CONTENT OF SAND SAMPLE',             'Ml4XCF-JS0o',3),
          ($1,'Total Clay',          'DETERMINATION OF TOTAL CLAY CONTENT IN THE GIVEN SAND SAMPLE', 'mP4BFzBnDN4',4),
          ($1,'pH of the Bentonite', 'DETERMINATION OF PH OF THE BENTONITE AND SAND SAMPLE',         'Wch3gJG2GJ4',5)
      `, [sec.id]);
      console.log('✅ Library seeded');
    } else {
      console.log('ℹ️  Library already has data, skipping');
    }

    // Seed default role permissions
    await client.query(`
      INSERT INTO role_permissions (role_name, page_key, can_view, can_create, can_update, can_delete) VALUES
        ('Admin','dashboard',      true,  true,  true,  true),
        ('Admin','worklog',        true,  true,  true,  true),
        ('Admin','visits',         true,  true,  true,  true),
        ('Admin','projects',       true,  true,  true,  true),
        ('Admin','masterdata',     true,  true,  true,  true),
        ('Admin','reports',        true,  true,  true,  true),
        ('Admin','admin',          true,  true,  true,  true),
        ('Admin','library',        true,  true,  true,  true),
        ('Admin','md_employees',   true,  true,  true,  true),
        ('Admin','md_departments', true,  true,  true,  true),
        ('Admin','md_roles',       true,  true,  true,  true),
        ('Admin','md_licenses',    true,  true,  true,  true),
        ('Admin','md_customers',   true,  true,  true,  true),
        ('Admin','md_emailconfig', true,  false, true,  false),
        ('Admin','md_accessconfig',true,  false, true,  false),
        ('Admin','md_categories',  true,  false, true,  false),
        ('Admin','_team_only',     false, false, false, false),
        ('Manager','dashboard',    true,  false, false, false),
        ('Manager','worklog',      true,  true,  true,  true),
        ('Manager','visits',       true,  true,  true,  false),
        ('Manager','projects',     true,  true,  true,  false),
        ('Manager','masterdata',   true,  false, false, false),
        ('Manager','reports',      true,  false, false, false),
        ('Manager','admin',        false, false, false, false),
        ('Manager','library',      true,  false, false, false),
        ('Manager','md_employees', true,  true,  true,  false),
        ('Manager','md_departments',false,false, false, false),
        ('Manager','md_roles',     false, false, false, false),
        ('Manager','md_licenses',  false, false, false, false),
        ('Manager','md_customers', true,  true,  true,  false),
        ('Manager','md_emailconfig',false,false, false, false),
        ('Manager','md_accessconfig',false,false,false, false),
        ('Manager','md_categories',false, false, false, false),
        ('Manager','_team_only',   true,  false, false, false),
        ('User','dashboard',       true,  false, false, false),
        ('User','worklog',         true,  true,  true,  true),
        ('User','visits',          false, false, false, false),
        ('User','projects',        true,  false, false, false),
        ('User','masterdata',      false, false, false, false),
        ('User','reports',         false, false, false, false),
        ('User','admin',           false, false, false, false),
        ('User','library',         true,  false, false, false),
        ('User','md_employees',    false, false, false, false),
        ('User','md_departments',  false, false, false, false),
        ('User','md_roles',        false, false, false, false),
        ('User','md_licenses',     false, false, false, false),
        ('User','md_customers',    false, false, false, false),
        ('User','md_emailconfig',  false, false, false, false),
        ('User','md_accessconfig', false, false, false, false),
        ('User','md_categories',   false, false, false, false),
        ('User','_team_only',      false, false, false, false)
      ON CONFLICT (role_name, page_key) DO NOTHING
    `);
    console.log('✅ Role permissions ready');

    console.log('');
    console.log('🎉 Seed complete!');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
