// ============================================================
// ETL Job: OLTP -> OLAP (Incremental Delta Load)
// Run: node etl_job.js
// ============================================================

const { Pool } = require('pg');

const oltpPool = new Pool({ connectionString: process.env.OLTP_DB_URL });
const olapPool = new Pool({ connectionString: process.env.OLAP_DB_URL });

async function getLastETLRun() {
  const res = await olapPool.query(
    `SELECT MAX(loaded_at) as last_run FROM fact_sales`
  );
  return res.rows[0].last_run || '1970-01-01';
}

async function extractOrders(since) {
  const res = await oltpPool.query(
    `SELECT 
      o.id as order_id,
      o.tenant_id,
      o.user_id,
      o.created_at,
      oi.product_id,
      oi.qty,
      oi.unit_price,
      (oi.qty * oi.unit_price) as revenue
     FROM orders o
     JOIN order_items oi ON o.id = oi.order_id
     WHERE o.updated_at > $1 AND o.status = 'delivered'`,
    [since]
  );
  return res.rows;
}

async function upsertFactSales(row) {
  // Resolve dim keys (simplified - in prod use surrogate key lookups)
  const dateKey = await resolveDateKey(row.created_at);
  const tenantKey = await resolveTenantKey(row.tenant_id);
  const productKey = await resolveProductKey(row.product_id, row.tenant_id);
  const customerKey = await resolveCustomerKey(row.user_id, row.tenant_id);

  await olapPool.query(
    `INSERT INTO fact_sales (order_id, date_key, tenant_key, product_key, customer_key, revenue, qty)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT DO NOTHING`,
    [row.order_id, dateKey, tenantKey, productKey, customerKey, row.revenue, row.qty]
  );
}

async function resolveDateKey(date) {
  const d = new Date(date);
  const res = await olapPool.query(
    `INSERT INTO dim_date (date, day, month, quarter, year, month_name, is_weekend)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (date) DO UPDATE SET date = EXCLUDED.date
     RETURNING date_key`,
    [
      d.toISOString().split('T')[0],
      d.getDate(),
      d.getMonth() + 1,
      Math.ceil((d.getMonth() + 1) / 3),
      d.getFullYear(),
      d.toLocaleString('default', { month: 'long' }),
      d.getDay() === 0 || d.getDay() === 6
    ]
  );
  return res.rows[0].date_key;
}

async function resolveTenantKey(tenantId) {
  const res = await olapPool.query(
    `SELECT tenant_key FROM dim_tenant WHERE tenant_id = $1`, [tenantId]
  );
  return res.rows[0]?.tenant_key || null;
}

async function resolveProductKey(productId, tenantId) {
  const res = await olapPool.query(
    `SELECT product_key FROM dim_product WHERE source_product_id = $1 AND tenant_id = $2 AND is_current = TRUE`,
    [productId, tenantId]
  );
  return res.rows[0]?.product_key || null;
}

async function resolveCustomerKey(userId, tenantId) {
  const res = await olapPool.query(
    `SELECT customer_key FROM dim_customer WHERE source_user_id = $1 AND tenant_id = $2`,
    [userId, tenantId]
  );
  return res.rows[0]?.customer_key || null;
}

async function runETL() {
  console.log('[ETL] Starting incremental load...');
  const since = await getLastETLRun();
  console.log(`[ETL] Extracting orders updated after: ${since}`);

  const orders = await extractOrders(since);
  console.log(`[ETL] Extracted ${orders.length} order line items`);

  for (const row of orders) {
    await upsertFactSales(row);
  }

  console.log(`[ETL] Loaded ${orders.length} rows into fact_sales`);
  console.log('[ETL] Done.');
}

runETL().catch(console.error).finally(() => {
  oltpPool.end();
  olapPool.end();
});
