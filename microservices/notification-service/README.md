# notification-service

## Notifications & Communications

### Port: 3015

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
- `/api/notification` - notification endpoints

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## 📊 Components

- **Routes**: 1
- **Controllers**: 1
- **Models**: 3
- **Services**: 2
- **Middleware**: 0
- **Jobs**: 2
- **Workers**: 3

## 🧪 Testing

```bash
npm test
```

## 📝 Logs

Logs are stored in `logs/` directory with daily rotation.

## 🔍 Monitoring

- Health check: `http://localhost:3015/health`
- Service status: Available via API Gateway
- Metrics: Integrated with monitoring service