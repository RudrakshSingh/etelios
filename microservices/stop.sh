#!/bin/bash

echo "🛑 Stopping Etelios Microservices..."

# Stop all services
docker-compose down

echo "✅ All services stopped!"