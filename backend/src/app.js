require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const migrate = require('./migrate');
const { startVisitReminderCron }   = require('./utils/visitReminder');
const { startWorklogDigestCron }   = require('./utils/worklogDigest');
const { startMeetingReminderCron } = require('./utils/meetingReminder');
const { startMotivationalQuoteCron } = require('./utils/motivationalQuote');

const app = express();

// Run migrations then start background jobs
migrate().then(() => {
  startVisitReminderCron();
  startWorklogDigestCron();
  startMeetingReminderCron();
  startMotivationalQuoteCron();
});
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
// Serve uploaded proof files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/roles',       require('./routes/roles'));
app.use('/api/employees',   require('./routes/employees'));
app.use('/api/licenses',    require('./routes/licenses'));    // ← NEW
app.use('/api/projects',    require('./routes/projects'));
app.use('/api/tasks',       require('./routes/tasks'));
app.use('/api/customers',   require('./routes/customers'));
app.use('/api/visits',      require('./routes/visits'));
app.use('/api/settings',    require('./routes/settings'));
app.use('/api/reports',     require('./routes/reports'));
app.use('/api/email-settings', require('./routes/emailSettings'));
app.use('/api/permissions',   require('./routes/permissions'));
app.use('/api/library',       require('./routes/library'));
app.use('/api/uploads',      require('./routes/uploads'));
app.use('/api/meetings',     require('./routes/meetings'));
app.use('/api/assets',        require('./routes/assets'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/inventory/items',      require('./routes/inventoryItems'));
app.use('/api/inventory/suppliers',  require('./routes/inventorySuppliers'));
app.use('/api/inventory/inward',     require('./routes/inventoryInward'));
app.use('/api/inventory/outward',    require('./routes/inventoryOutward'));
app.use('/api/marketing/leads',           require('./routes/marketingLeads'));
app.use('/api/marketing/products',        require('./routes/marketingProducts'));
app.use('/api/marketing/lead-sources',    require('./routes/marketingLeadSources'));
app.use('/api/marketing/business-areas',  require('./routes/marketingBusinessAreas'));
app.use('/api/marketing/foundry-types',   require('./routes/marketingFoundryTypes'));
app.use('/api/marketing/sand-types',      require('./routes/marketingSandTypes'));
app.use('/api/marketing/demo-types',      require('./routes/marketingDemoTypes'));
app.use('/api/marketing/product-phases',  require('./routes/marketingProductPhases'));
app.use('/api/marketing/orders',          require('./routes/marketingOrders'));
app.use('/api/marketing/implementation-progress', require('./routes/marketingImplementationProgress'));
app.use('/api/marketing/renewals',        require('./routes/marketingRenewals'));
app.use('/api/marketing/demos',           require('./routes/marketingDemos'));
app.use('/api/motivational-quotes',       require('./routes/motivationalQuotes'));

// Health check
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', time: new Date() })
);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 MPulse API → http://0.0.0.0:${PORT}`)
);