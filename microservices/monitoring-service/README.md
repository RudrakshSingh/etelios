# monitoring-service

## Monitoring & Health Checks

### Port: 3016

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


## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## 📊 Components

- **Routes**: 0
- **Controllers**: 1
- **Models**: 3
- **Services**: 2
- **Middleware**: 0
- **Jobs**: 0
- **Workers**: 1

## 🧪 Testing

```bash
npm test
```

## 📝 Logs

Logs are stored in `logs/` directory with daily rotation.

## 🔍 Monitoring

- Health check: `http://localhost:3016/health`
- Service status: Available via API Gateway
- Metrics: Integrated with monitoring service