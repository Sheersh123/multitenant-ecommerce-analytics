<div align="center">

<!-- Banner -->
![Banner](https://capsule-render.vercel.app/api?type=waving&color=0:1a1a2e,50:16213e,100:0f3460&height=200&section=header&text=Multi-Tenant%20E-Commerce%20Analytics%20Warehouse&fontSize=28&fontColor=ffffff&fontAlignY=38&desc=OLTP%20%2B%20OLAP%20%7C%20ETL%20Pipeline%20%7C%20Star%20Schema%20%7C%20Docker&descAlignY=58&descSize=16)

<!-- Badges -->
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=for-the-badge&logo=postgresql&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-green?style=for-the-badge&logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-REST%20API-black?style=for-the-badge&logo=express&logoColor=white)
![ETL](https://img.shields.io/badge/ETL-Pipeline-orange?style=for-the-badge&logo=apacheairflow&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

<br/>

> **A production-style, multi-tenant e-commerce platform** with dual-database architecture —
> **OLTP** for real-time transactional operations and **OLAP** for analytics and reporting.
> Built with PostgreSQL, Node.js, and Docker.

</div>

---

## Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [OLTP Schema](#-oltp-schema-design)
- [OLAP Star Schema](#-olap-star-schema)
- [ETL Pipeline](#-etl-pipeline)
- [API Endpoints](#-api-endpoints)
- [Getting Started](#-getting-started)
- [Resume Impact](#-resume-impact)
- [Author](#-author)

---

## Overview

This project solves a core real-world problem:

> **OLTP databases are fast for writes but slow for analytics. OLAP schemas are optimized for reads but not writes.**

Solution: Run both in parallel with an automated ETL pipeline.

| Feature | Description |
|---------|-------------|
| Multi-Tenancy | Multiple merchants share one DB, isolated by `tenant_id` |
| OLTP Schema | Normalized 3NF schema for real-time orders, stock, payments |
| OLAP Schema | Denormalized star schema for fast analytics and dashboards |
| ETL Pipeline | Nightly incremental job: OLTP → transform → OLAP |
| Docker | One command spins up the full system |
| REST API | Tenant-aware endpoints with atomic stock locking |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT / DASHBOARD                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────┐
│              Node.js / Express REST API                     │
│          (Tenant Auth via JWT / API Key)                    │
└────────────┬──────────────────────────────┬─────────────────┘
             │ CRUD Writes                  │ Analytics Reads
┌────────────▼────────────┐   ┌─────────────▼────────────────┐
│    OLTP PostgreSQL DB   │   │     OLAP PostgreSQL DB       │
│  (Normalized, 3NF)      │   │  (Star Schema, Partitioned)  │
│  orders, products,      │   │  fact_sales, dim_date,       │
│  payments, users        │   │  dim_product, dim_customer   │
└────────────┬────────────┘   └──────────────────────────────┘
             │                            ▲
             │   Nightly ETL (Node.js)    │
             └────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend API | Node.js 20 + Express.js |
| OLTP Database | PostgreSQL 16 (normalized, ACID) |
| OLAP Database | PostgreSQL 16 (star schema, partitioned) |
| ETL Pipeline | Node.js cron job + raw SQL |
| Containerization | Docker + Docker Compose |
| Auth | JWT / API Key per tenant |
| Query Optimization | Composite indexes, materialized views |

---

## Project Structure

```
multitenant-ecommerce-analytics/
├── api/
│   ├── index.js              # Express REST API (orders, analytics)
│   ├── package.json          # Dependencies: express, pg
│   └── Dockerfile            # Multi-stage Node.js 20 build
├── etl/
│   ├── etl_job.js            # Incremental ETL: OLTP → OLAP
│   ├── package.json          # Dependencies: pg
│   └── Dockerfile            # ETL container
├── oltp/
│   └── schema.sql            # Normalized OLTP tables + indexes
├── olap/
│   └── star_schema.sql       # Fact + Dimension tables
├── seeds/
│   └── seed.sql              # Sample tenants, products, orders
├── docker-compose.yml        # Full stack orchestration
├── .gitignore
└── README.md
```

---

## OLTP Schema Design

Normalized to **3NF** for ACID-compliant transactional operations.

```sql
tenants      → id, name, api_key
users        → id, tenant_id (FK), email, role
products     → id, tenant_id (FK), sku, name, price, stock
orders       → id (UUID), tenant_id (FK), user_id (FK), status, total
order_items  → order_id (FK), product_id (FK), qty, unit_price
payments     → id, order_id (FK), amount, status, gateway_txn_id
audit_log    → id, table_name, action, old_data, new_data, changed_at
```

**Key Design Decisions:**
- UUID for `orders.id` — enables idempotent API calls
- `SELECT FOR UPDATE` on product rows — prevents overselling under concurrency
- Composite index on `(tenant_id, created_at)` — fast tenant-scoped queries
- `CHECK (stock >= 0)` constraint — DB-level integrity
- Trigger on critical tables → populates `audit_log` automatically

---

## OLAP Star Schema

Denormalized for **sub-50ms dashboard queries**.

```
              dim_date
                 │
dim_customer ── fact_sales ── dim_product
                 │
              dim_tenant
```

| Table | Purpose |
|-------|---------|
| `fact_sales` | Grain: order line item. Stores revenue, qty, returns |
| `dim_date` | year, month, quarter, is_weekend |
| `dim_product` | SCD Type 2 — tracks historical price/category changes |
| `dim_customer` | cohort_month, rfm_score for segmentation |
| `dim_tenant` | Tenant metadata snapshot |

**Optimizations:**
- Table partitioned by `tenant_id` and `year`
- Materialized views for top KPIs (refreshed post-ETL)
- Surrogate integer keys for fast joins

---

## ETL Pipeline

Runs nightly via cron. Incremental delta load using watermark table.

```
Extract  →  SELECT from OLTP WHERE updated_at > last_etl_run
Transform → Aggregate line items, resolve dim keys, compute revenue
Load     →  UPSERT into fact_sales (INSERT ON CONFLICT DO UPDATE)
```

**Features:**
- Idempotent — safe to re-run without duplicates
- Watermark table tracks last successful ETL timestamp
- Runs in ~2-5 min for 10k orders
- dbt-compatible SQL models (incremental strategy)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tenants` | Register a new tenant |
| POST | `/tenants/:id/products` | Add product to tenant catalog |
| POST | `/tenants/:id/orders` | Place order (atomic stock lock) |
| GET | `/tenants/:id/orders` | List all orders for tenant |
| GET | `/tenants/:id/analytics/revenue` | Revenue by month (OLAP) |
| GET | `/tenants/:id/analytics/top-products` | Top products by sales (OLAP) |

---

## Getting Started

### Prerequisites
- Docker Desktop installed
- Git

### Run in One Command

```bash
# 1. Clone the repo
git clone https://github.com/Sheersh123/multitenant-ecommerce-analytics.git
cd multitenant-ecommerce-analytics

# 2. Start all services
docker-compose up --build

# 3. Seed sample data
docker exec -i oltp-db psql -U postgres -d oltp < seeds/seed.sql

# 4. API is live at
http://localhost:3000

# 5. Run ETL manually
docker exec etl node etl_job.js
```

### Services Started

| Service | Port | Description |
|---------|------|-------------|
| API | 3000 | Node.js REST API |
| OLTP DB | 5432 | PostgreSQL transactional DB |
| OLAP DB | 5433 | PostgreSQL analytics DB |
| ETL | — | Cron-based ETL container |

---
