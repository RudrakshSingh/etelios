#!/bin/bash

echo "🚀 Starting Etelios Microservices with COMPLETE logic..."

# Create network
docker network create etelios-network 2>/dev/null || true

# Start all services
docker-compose up -d

echo "✅ All services started with COMPLETE logic!"
echo "🌐 API Gateway: http://localhost:8000"
echo "📊 Kong Admin: http://localhost:8001"
echo "🔍 Consul UI: http://localhost:8500"
echo "🐰 RabbitMQ: http://localhost:15672"