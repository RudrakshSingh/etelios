# auth-service

## Authentication & User Management

### Port: 3001

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
- `/api/auth` - auth endpoints
- `/api/real-users` - realUsers endpoints
- `/api/permission` - permission endpoints

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## 📊 Components

- **Routes**: 3
- **Controllers**: 3
- **Models**: 4
- **Services**: 2
- **Middleware**: 3
- **Jobs**: 0
- **Workers**: 0

## 🧪 Testing

```bash
npm test
```

## 📝 Logs

Logs are stored in `logs/` directory with daily rotation.

## 🔍 Monitoring

- Health check: `http://localhost:3001/health`
- Service status: Available via API Gateway
- Metrics: Integrated with monitoring service