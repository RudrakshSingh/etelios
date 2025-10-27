# 🚀 Etelios Production Deployment Guide

## **📋 Pre-Deployment Checklist**

### **✅ System Requirements**
- [ ] Docker Desktop installed and running
- [ ] Azure CLI installed (`az --version`)
- [ ] Node.js 18+ installed
- [ ] Git repository up to date
- [ ] Production environment variables configured

### **✅ Build Verification**
```bash
# Verify build system
npm run build:prod

# Verify Docker configuration
npm run docker:verify

# Test Docker build (if Docker is running)
npm run docker:test
```

## **🐳 Docker Deployment**

### **1. Local Docker Testing**
```bash
# Build production image
npm run docker:build:prod

# Run with production environment
docker run -d \
  --name etelios-backend \
  --env-file production.env \
  -p 3000:3000 \
  etelios-backend:prod

# Check container status
docker ps
docker logs etelios-backend

# Test health endpoint
curl http://localhost:3000/health
```

### **2. Docker Compose Production**
```bash
# Deploy with Docker Compose
npm run docker:prod

# Check services
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### **3. Container Health Check**
```bash
# Check container health
docker inspect etelios-backend | grep -A 10 Health

# Monitor container metrics
docker stats etelios-backend
```

## **☁️ Azure Cloud Deployment**

### **1. Azure CLI Setup**
```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "your-subscription-id"

# Verify login
az account show
```

### **2. Automated Azure Deployment**
```bash
# Run complete Azure deployment
./azure-deployment-script.sh

# Monitor deployment
az group show --name etelios-rg
az webapp list --resource-group etelios-rg
```

### **3. Manual Azure Deployment**
```bash
# Create resource group
az group create --name etelios-rg --location eastus

# Create App Service Plan
az appservice plan create \
  --name etelios-plan \
  --resource-group etelios-rg \
  --sku P1V2 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group etelios-rg \
  --plan etelios-plan \
  --name etelios-backend \
  --deployment-local-git

# Configure app settings
az webapp config appsettings set \
  --resource-group etelios-rg \
  --name etelios-backend \
  --settings @production.env
```

## **🔧 Production Configuration**

### **1. Environment Variables**
```bash
# Copy production environment
cp production.env .env

# Update with actual values
nano .env

# Required production variables:
# - MONGO_URI (Azure Cosmos DB)
# - REDIS_URL (Azure Cache for Redis)
# - JWT_SECRET (secure random string)
# - AZURE_STORAGE_CONNECTION_STRING
# - APPINSIGHTS_INSTRUMENTATIONKEY
```

### **2. Security Configuration**
```bash
# Generate secure JWT secret
openssl rand -base64 32

# Generate session secret
openssl rand -base64 64

# Update production.env with generated secrets
```

### **3. Database Setup**
```bash
# Create Azure Cosmos DB
az cosmosdb create \
  --resource-group etelios-rg \
  --name etelios-cosmos \
  --kind MongoDB

# Get connection string
az cosmosdb keys list \
  --resource-group etelios-rg \
  --name etelios-cosmos \
  --type connection-strings
```

## **📊 Multi-Tenant Deployment**

### **1. Start Multi-Tenant Services**
```bash
# Start all 18 microservices
npm run multitenant:start

# Verify all services are running
npm run multitenant:health
```

### **2. Create Production Tenant**
```bash
# Create first tenant
curl -X POST http://localhost:3020/api/tenants \
  -H 'Content-Type: application/json' \
  -d '{
    "tenantName": "Production Company",
    "domain": "prod.etelios.com",
    "subdomain": "prod",
    "plan": "enterprise"
  }'
```

### **3. Test Multi-Tenant APIs**
```bash
# Test tenant-specific endpoints
npm run multitenant:test

# Verify tenant isolation
curl http://localhost:3001/api/auth/health
curl http://localhost:3002/api/hr/health
```

## **🔍 Monitoring & Health Checks**

### **1. Application Health**
```bash
# Main application health
curl http://localhost:3000/health

# Service-specific health checks
curl http://localhost:3001/health  # Auth service
curl http://localhost:3002/health  # HR service
curl http://localhost:3020/health  # Tenant registry
curl http://localhost:3021/health  # Real-time service
```

### **2. Container Health**
```bash
# Docker container health
docker inspect etelios-backend | grep -A 5 Health

# Container logs
docker logs etelios-backend --tail 100

# Resource usage
docker stats etelios-backend
```

### **3. Azure Monitoring**
```bash
# Application Insights
az monitor app-insights component show \
  --resource-group etelios-rg \
  --app etelios-insights

# View metrics
az monitor metrics list \
  --resource etelios-backend \
  --metric "Requests"
```

## **🚨 Troubleshooting**

### **Common Issues**

#### **1. Docker Build Fails**
```bash
# Check Docker daemon
docker info

# Verify Dockerfile syntax
docker build --dry-run .

# Check for missing files
ls -la src/server.js
ls -la src/utils/
```

#### **2. Container Won't Start**
```bash
# Check container logs
docker logs etelios-backend

# Verify environment variables
docker exec etelios-backend env

# Check port conflicts
netstat -tulpn | grep 3000
```

#### **3. Health Check Fails**
```bash
# Test health endpoint manually
curl -v http://localhost:3000/health

# Check application logs
docker logs etelios-backend | grep -i error

# Verify dependencies
docker exec etelios-backend npm list
```

#### **4. Azure Deployment Issues**
```bash
# Check Azure CLI login
az account show

# Verify resource group
az group show --name etelios-rg

# Check app service logs
az webapp log tail --resource-group etelios-rg --name etelios-backend
```

## **📈 Performance Optimization**

### **1. Container Optimization**
```bash
# Build optimized image
docker build --target production -t etelios-backend:optimized .

# Run with resource limits
docker run -d \
  --name etelios-backend \
  --memory=1g \
  --cpus=0.5 \
  --env-file production.env \
  -p 3000:3000 \
  etelios-backend:optimized
```

### **2. Azure Scaling**
```bash
# Configure auto-scaling
az monitor autoscale create \
  --resource-group etelios-rg \
  --resource etelios-plan \
  --resource-type Microsoft.Web/serverfarms \
  --name etelios-autoscale \
  --min-count 2 \
  --max-count 10 \
  --count 2
```

## **🔄 CI/CD Pipeline**

### **1. GitHub Actions**
```bash
# Push to trigger deployment
git push origin main

# Check workflow status
gh run list

# View deployment logs
gh run view --log
```

### **2. Azure DevOps**
```bash
# Trigger pipeline
az pipelines run --name "etelios-deployment"

# Check pipeline status
az pipelines runs list --pipeline-name "etelios-deployment"
```

## **✅ Post-Deployment Verification**

### **1. Functional Testing**
```bash
# Test all endpoints
npm run test:all-apis

# Test multi-tenant functionality
npm run multitenant:test

# Verify health checks
curl http://your-app.azurewebsites.net/health
```

### **2. Performance Testing**
```bash
# Load test (if artillery is installed)
artillery quick --count 100 --num 10 http://localhost:3000/health

# Monitor resource usage
docker stats etelios-backend
```

### **3. Security Testing**
```bash
# Check security headers
curl -I http://localhost:3000/health

# Test rate limiting
for i in {1..10}; do curl http://localhost:3000/health; done
```

## **📋 Production Checklist**

- [ ] Docker image builds successfully
- [ ] Container starts and responds to health checks
- [ ] All 18 microservices running
- [ ] Multi-tenant architecture working
- [ ] Database connections established
- [ ] Redis cache working
- [ ] File uploads working
- [ ] Email notifications working
- [ ] Audit logging enabled
- [ ] Security headers configured
- [ ] Rate limiting active
- [ ] Monitoring and alerts configured
- [ ] Backup strategy implemented
- [ ] SSL certificates configured
- [ ] Domain DNS configured

## **🎯 Success Criteria**

✅ **Deployment Successful When:**
- Health endpoint returns 200 OK
- All microservices responding
- Database connections stable
- Container running without errors
- Performance metrics within limits
- Security tests passing
- Multi-tenant isolation working

**🚀 Etelios is now production-ready and deployed!**
