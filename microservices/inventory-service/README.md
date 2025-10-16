# inventory-service

## ERP & Inventory Management

### Port: 3006

## 🚀 Quick Start

### Development
```bash
npm install
npm run dev
```

### Production
```bash
npm install
npm start
```

### Docker
```bash
docker-compose up -d
```

## 📋 API Endpoints

### Health Check
- `GET /health` - Service health status

### Main Routes
- `/api/erp` - erp endpoints
- `/api/assets` - assets endpoints
- `/api/asset-register` - assetRegister endpoints

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## 📊 Components

- **Routes**: 3
- **Controllers**: 3
- **Models**: 14
- **Services**: 5
- **Middleware**: 0
- **Jobs**: 1
- **Workers**: 0

## 🧪 Testing

```bash
npm test
```

## 📝 Logs

Logs are stored in `logs/` directory with daily rotation.

## 🔍 Monitoring

- Health check: `http://localhost:3006/health`
- Service status: Available via API Gateway
- Metrics: Integrated with monitoring service