# service-management

## Service & SLA Management

### Port: 3011

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
- `/api/service` - service endpoints
- `/api/service-s-l-a` - serviceSLA endpoints
- `/api/compliance` - compliance endpoints

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## 📊 Components

- **Routes**: 3
- **Controllers**: 3
- **Models**: 5
- **Services**: 4
- **Middleware**: 0
- **Jobs**: 0
- **Workers**: 0

## 🧪 Testing

```bash
npm test
```

## 📝 Logs

Logs are stored in `logs/` directory with daily rotation.

## 🔍 Monitoring

- Health check: `http://localhost:3011/health`
- Service status: Available via API Gateway
- Metrics: Integrated with monitoring service