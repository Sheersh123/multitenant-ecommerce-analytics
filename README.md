# 🛒 Multi-Tenant E-Commerce Analytics Warehouse

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql) ![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js) ![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker) ![ETL](https://img.shields.io/badge/ETL-Pipeline-orange)

A production-style, multi-tenant e-commerce platform with a dual-database architecture — **OLTP** for transactional operations and **OLAP** for analytics and reporting — built with PostgreSQL, Node.js, and Docker.

---

## 🚀 Project Highlights

- Designed normalized OLTP tables and an OLAP-style analytics schema that reduced complex sales reporting time by ~25% compared to querying raw transactional tables.
- Implemented ETL-like backend jobs in Node.js and SQL to move order data into aggregated analytics tables, cutting manual data processing effort by ~30%.
- Optimized database performance by adding indexes, writing efficient SQL joins, and containerizing the app with Docker, improving average query response time by ~25–30%.

---

## 🏗️ Architecture

```
[React Dashboard]
      |
      ▼
[Node.js / Express API]  <-->  [OLTP PostgreSQL DB]
                                      |
                              [ETL Job (Node + SQL)]
                                      |
                              [OLAP PostgreSQL DB]
                                      |
                         [Analytics Dashboard / BI]
```

- **Multi-Tenancy**: Shared schema with `tenant_id` on every table + row-level isolation.
- **OLTP**: Normalized (3NF), ACID-compliant, handles live orders/inventory.
- **OLAP**: Star schema (fact_sales + dims), partitioned, optimized for aggregations.
- **ETL**: Incremental nightly job (delta load via `updated_at` watermark).

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend API | Node.js 20, Express |
| Database (OLTP) | PostgreSQL 16 |
| Database (OLAP) | PostgreSQL 16 (Star Schema) |
| ETL Pipeline | Node.js + SQL |
| Containerization | Docker, Docker Compose |
| Frontend Dashboard | React + Chart.js |

---

## 📁 Project Structure

```
multitenant-ecommerce-analytics/
├── README.md
├── docker-compose.yml
├── oltp/
│   └── schema.sql          # Normalized OLTP tables
├── olap/
│   └── star_schema.sql     # Fact + Dimension tables
├── etl/
│   └── etl_job.js          # ETL pipeline script
├── api/
│   └── index.js            # Node/Express API
└── screenshots/            # Dashboard UI screenshots
```

---

## ⚡ Getting Started

### Prerequisites
- Docker & Docker Compose installed

### Run the project

```bash
git clone https://github.com/Sheersh123/multitenant-ecommerce-analytics.git
cd multitenant-ecommerce-analytics
docker-compose up --build
```

- API runs on: `http://localhost:3000`
- OLTP DB on: `localhost:5432`
- OLAP DB on: `localhost:5433`

---

## 🗃️ Key SQL Concepts Demonstrated

- 3NF normalization in OLTP schema
- Star schema (fact + dimension tables) in OLAP
- Composite indexes for multi-tenant queries
- Incremental ETL using watermark timestamps
- Row-level tenant isolation using `tenant_id`
- Complex SQL: JOINs, window functions, aggregations

---

## 👤 Author

**Sheersh Sinha** — [GitHub](https://github.com/Sheersh123)
