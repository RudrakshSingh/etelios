#!/bin/bash

echo "🔍 Checking service health..."

services=(
  "auth-service:3001"
  "hr-service:3002"
  "attendance-service:3003"
  "payroll-service:3004"
  "crm-service:3005"
  "inventory-service:3006"
  "sales-service:3007"
  "purchase-service:3008"
  "financial-service:3009"
  "document-service:3010"
  "service-management:3011"
  "cpp-service:3012"
  "prescription-service:3013"
  "analytics-service:3014"
  "notification-service:3015"
  "monitoring-service:3016"
)

for service in "${services[@]}"; do
  name=${service%:*}
  port=${service#*:}
  
  if curl -f http://localhost:$port/health >/dev/null 2>&1; then
    echo "✅ $name is healthy"
  else
    echo "❌ $name is unhealthy"
  fi
done