# crm-service

## Customer Management & Engagement

### Port: 3005

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
- `/api/crm` - crm endpoints
- `/api/engagement` - engagement endpoints
- `/api/incentive` - incentive endpoints

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## 📊 Components

- **Routes**: 3
- **Controllers**: 3
- **Models**: 11
- **Services**: 3
- **Middleware**: 0
- **Jobs**: 1
- **Workers**: 2

## 🧪 Testing

```bash
npm test
```

## 📝 Logs

Logs are stored in `logs/` directory with daily rotation.

## 🔍 Monitoring

- Health check: `http://localhost:3005/health`
- Service status: Available via API Gateway
- Metrics: Integrated with monitoring service