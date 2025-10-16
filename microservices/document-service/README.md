# document-service

## Document & E-signature Management

### Port: 3010

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
- `/api/documents` - documents endpoints
- `/api/esign` - esign endpoints
- `/api/contracts-vault` - contractsVault endpoints
- `/api/document-verification` - documentVerification endpoints

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## 📊 Components

- **Routes**: 4
- **Controllers**: 4
- **Models**: 3
- **Services**: 5
- **Middleware**: 1
- **Jobs**: 1
- **Workers**: 0

## 🧪 Testing

```bash
npm test
```

## 📝 Logs

Logs are stored in `logs/` directory with daily rotation.

## 🔍 Monitoring

- Health check: `http://localhost:3010/health`
- Service status: Available via API Gateway
- Metrics: Integrated with monitoring service