# hr-service

## HR Management & Employee Data

### Port: 3002

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
- `/api/hr` - hr endpoints
- `/api/hr-letter` - hrLetter endpoints
- `/api/transfer` - transfer endpoints

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## 📊 Components

- **Routes**: 3
- **Controllers**: 3
- **Models**: 5
- **Services**: 3
- **Middleware**: 1
- **Jobs**: 1
- **Workers**: 1

## 🧪 Testing

```bash
npm test
```

## 📝 Logs

Logs are stored in `logs/` directory with daily rotation.

## 🔍 Monitoring

- Health check: `http://localhost:3002/health`
- Service status: Available via API Gateway
- Metrics: Integrated with monitoring service