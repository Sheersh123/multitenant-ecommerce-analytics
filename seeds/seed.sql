-- ============================================================
-- Seed Data: Sample Tenants, Users, Products, Orders
-- Run against OLTP DB: psql -U postgres -d oltp_ecommerce -f seed.sql
-- ============================================================

-- Tenants
INSERT INTO tenants (name) VALUES
  ('ShopEasy'),
  ('TechMart'),
  ('FashionHub')
ON CONFLICT DO NOTHING;

-- Users
INSERT INTO users (tenant_id, email, role) VALUES
  (1, 'alice@shopeasy.com', 'customer'),
  (1, 'bob@shopeasy.com', 'customer'),
  (1, 'admin@shopeasy.com', 'admin'),
  (2, 'carol@techmart.com', 'customer'),
  (2, 'dave@techmart.com', 'customer'),
  (3, 'eve@fashionhub.com', 'customer')
ON CONFLICT DO NOTHING;

-- Products
INSERT INTO products (tenant_id, name, sku, price, stock, category) VALUES
  (1, 'Wireless Earbuds', 'SE-001', 1299.00, 100, 'Electronics'),
  (1, 'Phone Case', 'SE-002', 299.00, 200, 'Accessories'),
  (1, 'USB-C Cable', 'SE-003', 199.00, 150, 'Accessories'),
  (2, 'Mechanical Keyboard', 'TM-001', 3499.00, 50, 'Peripherals'),
  (2, 'Gaming Mouse', 'TM-002', 1999.00, 75, 'Peripherals'),
  (3, 'Denim Jacket', 'FH-001', 2499.00, 40, 'Clothing'),
  (3, 'Sneakers', 'FH-002', 3999.00, 30, 'Footwear')
ON CONFLICT DO NOTHING;

-- Orders
INSERT INTO orders (id, tenant_id, user_id, status, total) VALUES
  (gen_random_uuid(), 1, 1, 'delivered', 1598.00),
  (gen_random_uuid(), 1, 2, 'delivered', 299.00),
  (gen_random_uuid(), 2, 4, 'delivered', 3499.00),
  (gen_random_uuid(), 2, 5, 'delivered', 1999.00),
  (gen_random_uuid(), 3, 6, 'delivered', 6498.00);
