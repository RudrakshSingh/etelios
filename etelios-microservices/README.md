# Etelios - Multi-Tenant Retail OS Microservices

## 🏗️ Architecture Overview

Etelios is a comprehensive, multi-tenant retail operating system built as microservices, designed to serve multiple verticals (Optical, Grocery, Clothing, Shoes, QSR, Electronics) with offline-first POS capabilities and omnichannel e-commerce.

## 🎯 Core Principles

- **Multi-Tenancy**: Schema-per-tenant isolation with tenant context propagation
- **Offline-First**: POS works without internet, syncs when connected
- **Event-Driven**: Kafka-based event bus with outbox pattern
- **SaaS-Ready**: White-labeling, billing, metering, and tenant provisioning
- **Vertical-Agnostic**: Extensible for different retail verticals

## 🏛️ Service Architecture

### Core Services (22 Microservices)

1. **Auth & Identity Service** - OIDC/OAuth2, SSO, RBAC/ABAC
2. **Tenancy Service** - Tenant management, org structure, feature flags
3. **Catalog Service** - Products, variants, attributes, taxonomy
4. **Pricing & Promotions Service** - Price lists, discounts, promotions
5. **Inventory Service** - Stock management, batches, reservations
6. **Orders Service** - Cart, orders, payments, returns
7. **Payments Service** - Payment processing, reconciliation
8. **Fulfillment Service** - Pick/pack/ship, logistics
9. **Procurement Service** - Purchase orders, vendors, ASN
10. **Finance Service** - Invoicing, GST, compliance
11. **CRM Service** - Customer 360, profiles, interactions
12. **Loyalty Service** - Points, tiers, referrals, wallet
13. **Reviews & ORM Service** - Reviews, ratings, social integration
14. **Task & Workflow Service** - Tasks, SLAs, approvals
15. **HR & Attendance Service** - Staff management, attendance
16. **Training/LMS Service** - Courses, assessments, AI integration
17. **Notifications Service** - Email/SMS/WhatsApp/Push
18. **Search Service** - OpenSearch integration
19. **Analytics Service** - BI, dashboards, reporting
20. **Files/Media Service** - S3-compatible storage
21. **CMS/Content Service** - Content management, A/B testing
22. **Audit Service** - Immutable audit logs

### BFF Layer (Backend-for-Frontend)

- **bff-admin** - Admin console backend
- **bff-pos** - POS PWA backend
- **bff-storefront** - E-commerce frontend backend
- **bff-store-dashboard** - Store operations backend
- **bff-customer** - Customer app backend

## 🗄️ Data Architecture

- **Primary DB**: MongoDB per service with tenant isolation
- **Cache**: Redis for session management and caching
- **Search**: OpenSearch for product/customer search
- **Analytics**: ClickHouse for time-series data
- **Storage**: S3-compatible object storage
- **Event Bus**: Kafka for event streaming

## 🔐 Multi-Tenancy Strategy

### Isolation Levels
1. **Schema-per-tenant** (Default) - Balanced isolation
2. **DB-per-tenant** (Enterprise) - Maximum isolation
3. **Row-level** (Shared DB) - Cost-effective

### Tenant Context Propagation
```javascript
// JWT Claims
{
  "tenant_id": "t_123",
  "org_id": "org_456", 
  "store_id": "store_789",
  "roles": ["admin", "store_manager"],
  "permissions": ["read:inventory", "write:orders"]
}
```

## 🚀 Key Features

### Offline-First POS
- Local IndexedDB storage
- Background sync with conflict resolution
- Peripheral support (printers, scanners)
- Queue-based order processing

### Vertical Extensions
- **Optical**: LIMS, Rx capture, lens options
- **Grocery**: Batch/expiry, cold chain
- **Clothing**: Size charts, fit guides
- **QSR**: KOT, kitchen screens, combos

### SaaS Features
- White-labeling and branding
- Usage metering and billing
- Feature flags and entitlements
- Multi-region deployment

## 📊 Event-Driven Architecture

### Event Examples
```javascript
// Order Placed Event
{
  "event_id": "evt_123",
  "tenant_id": "t_123",
  "event_type": "order.placed",
  "occurred_at": "2025-10-10T13:00:00Z",
  "data": {
    "order_id": "ord_001",
    "customer_id": "cust_456",
    "total_amount": 2359,
    "items": [...]
  }
}
```

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js, MongoDB
- **Event Bus**: Kafka
- **Cache**: Redis
- **Search**: OpenSearch
- **Analytics**: ClickHouse
- **Storage**: MinIO (S3-compatible)
- **Gateway**: Kong
- **Service Discovery**: Consul
- **Monitoring**: Prometheus, Grafana
- **Container**: Docker, Kubernetes

## 🚦 Getting Started

1. **Prerequisites**
   ```bash
   # Install dependencies
   npm install -g @nestjs/cli
   docker-compose up -d
   ```

2. **Start Core Services**
   ```bash
   # Start infrastructure
   docker-compose up -d kafka redis mongodb
   
   # Start microservices
   npm run start:all
   ```

3. **Create Tenant**
   ```bash
   curl -X POST http://localhost:3000/api/tenants \
     -H "Content-Type: application/json" \
     -d '{"name": "Demo Store", "domain": "demo.etelios.app"}'
   ```

## 📈 SaaS Metering

### Usage Metrics
- Monthly Active Users (MAU)
- Orders per month
- SKUs count
- Storage usage
- API calls

### Billing Plans
- **Starter**: 1 store, 5 users, 5k SKUs
- **Growth**: 10 stores, 50 users, unlimited SKUs
- **Enterprise**: Unlimited, DB-per-tenant, SSO

## 🔄 Development Workflow

1. **Feature Development**
   - Create feature branch
   - Implement service changes
   - Add event contracts
   - Update API documentation

2. **Testing**
   - Unit tests per service
   - Integration tests
   - Contract tests (Pact)
   - Load testing

3. **Deployment**
   - Blue/Green deployment
   - Database migrations
   - Feature flags
   - Monitoring

## 📚 Documentation

- [API Documentation](./docs/api/)
- [Event Contracts](./docs/events/)
- [Deployment Guide](./docs/deployment/)
- [SaaS Guide](./docs/saas/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

Proprietary - Etelios Retail OS
