// ============================================================
// E-Commerce API: Multi-Tenant Node.js + Express
// ============================================================

const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const oltpPool = new Pool({ connectionString: process.env.OLTP_DB_URL });
const olapPool = new Pool({ connectionString: process.env.OLAP_DB_URL });

// Middleware: Extract tenant from header
app.use((req, res, next) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.status(400).json({ error: 'x-tenant-id header required' });
  req.tenantId = parseInt(tenantId);
  next();
});

// GET /products - List products for tenant
app.get('/products', async (req, res) => {
  const result = await oltpPool.query(
    'SELECT * FROM products WHERE tenant_id = $1 ORDER BY created_at DESC',
    [req.tenantId]
  );
  res.json(result.rows);
});

// POST /orders - Place order with stock lock (atomic)
app.post('/orders', async (req, res) => {
  const { userId, items } = req.body;
  const client = await oltpPool.connect();
  try {
    await client.query('BEGIN');
    let total = 0;
    for (const item of items) {
      // Lock and check stock
      const stock = await client.query(
        'SELECT stock, price FROM products WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
        [item.productId, req.tenantId]
      );
      if (!stock.rows[0] || stock.rows[0].stock < item.qty) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }
      // Decrement stock
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.qty, item.productId]
      );
      total += stock.rows[0].price * item.qty;
    }
    // Insert order
    const order = await client.query(
      'INSERT INTO orders (tenant_id, user_id, total) VALUES ($1, $2, $3) RETURNING id',
      [req.tenantId, userId, total]
    );
    const orderId = order.rows[0].id;
    // Insert order items
    for (const item of items) {
      const price = await client.query('SELECT price FROM products WHERE id = $1', [item.productId]);
      await client.query(
        'INSERT INTO order_items (order_id, product_id, qty, unit_price) VALUES ($1, $2, $3, $4)',
        [orderId, item.productId, item.qty, price.rows[0].price]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ orderId, total });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /analytics/revenue - Tenant revenue from OLAP
app.get('/analytics/revenue', async (req, res) => {
  const result = await olapPool.query(
    `SELECT 
       d.year, d.month_name,
       SUM(f.revenue) as total_revenue,
       COUNT(DISTINCT f.customer_key) as unique_customers,
       AVG(f.revenue) as avg_order_value
     FROM fact_sales f
     JOIN dim_date d ON f.date_key = d.date_key
     JOIN dim_tenant t ON f.tenant_key = t.tenant_key
     WHERE t.tenant_id = $1
     GROUP BY d.year, d.month_name
     ORDER BY d.year, d.month_name`,
    [req.tenantId]
  );
  res.json(result.rows);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
