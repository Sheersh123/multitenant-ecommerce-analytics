-- ============================================================
-- OLAP Schema: Star Schema for E-Commerce Analytics
-- ============================================================

-- Dimension: Date
CREATE TABLE IF NOT EXISTS dim_date (
    date_key SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    day INT,
    month INT,
    quarter INT,
    year INT,
    month_name VARCHAR(20),
    is_weekend BOOLEAN DEFAULT FALSE
);

-- Dimension: Tenant
CREATE TABLE IF NOT EXISTS dim_tenant (
    tenant_key SERIAL PRIMARY KEY,
    tenant_id INT UNIQUE NOT NULL,
    name VARCHAR(100),
    signup_date DATE
);

-- Dimension: Product (SCD Type 2 ready)
CREATE TABLE IF NOT EXISTS dim_product (
    product_key SERIAL PRIMARY KEY,
    source_product_id INT NOT NULL,
    tenant_id INT NOT NULL,
    name VARCHAR(200),
    sku VARCHAR(100),
    category VARCHAR(100),
    price DECIMAL(10, 2),
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_to DATE,
    is_current BOOLEAN DEFAULT TRUE
);

-- Dimension: Customer
CREATE TABLE IF NOT EXISTS dim_customer (
    customer_key SERIAL PRIMARY KEY,
    source_user_id INT NOT NULL,
    tenant_id INT NOT NULL,
    cohort_month VARCHAR(7),  -- e.g., '2024-01'
    rfm_score VARCHAR(10)
);

-- Fact Table: Sales
CREATE TABLE IF NOT EXISTS fact_sales (
    sales_key SERIAL PRIMARY KEY,
    order_id VARCHAR(100),
    date_key INT REFERENCES dim_date(date_key),
    tenant_key INT REFERENCES dim_tenant(tenant_key),
    product_key INT REFERENCES dim_product(product_key),
    customer_key INT REFERENCES dim_customer(customer_key),
    revenue DECIMAL(10, 2),
    qty INT,
    discount DECIMAL(10, 2) DEFAULT 0,
    returns_flag BOOLEAN DEFAULT FALSE,
    loaded_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Indexes for analytics query performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_fact_tenant ON fact_sales(tenant_key);
CREATE INDEX IF NOT EXISTS idx_fact_date ON fact_sales(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_product ON fact_sales(product_key);
CREATE INDEX IF NOT EXISTS idx_fact_revenue ON fact_sales(revenue);

-- ============================================================
-- Sample KPI Query: Monthly Revenue per Tenant
-- ============================================================
-- SELECT 
--   dt.year, dt.month_name, dte.name as tenant,
--   SUM(f.revenue) as total_revenue,
--   COUNT(DISTINCT f.customer_key) as unique_customers,
--   AVG(f.revenue) as avg_order_value
-- FROM fact_sales f
-- JOIN dim_date dt ON f.date_key = dt.date_key
-- JOIN dim_tenant dte ON f.tenant_key = dte.tenant_key
-- GROUP BY dt.year, dt.month_name, dte.name
-- ORDER BY dt.year, dt.month_name;
