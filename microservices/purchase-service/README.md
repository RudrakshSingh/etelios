# purchase-service

## Purchase & Vendor Management

### Port: 3008

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
- `/api/purchase` - purchase endpoints

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## 📊 Components

- **Routes**: 1
- **Controllers**: 1
- **Models**: 7
- **Services**: 1
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

- Health check: `http://localhost:3008/health`
- Service status: Available via API Gateway
- Metrics: Integrated with monitoring service