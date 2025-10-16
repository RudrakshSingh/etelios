# Lenstrack E-commerce System

A comprehensive e-commerce platform built with Node.js, Express, MongoDB, and modern JavaScript technologies. This system provides a complete solution for optical retail businesses with advanced features like page builder, inventory management, and multi-channel support.

## 🚀 Features

### Core E-commerce Features
- **Product Management**: Complete product catalog with variants, categories, and attributes
- **Order Management**: Full order lifecycle from cart to delivery
- **Customer Management**: Customer profiles, addresses, and order history
- **Payment Integration**: Multiple payment gateways (Razorpay, Stripe, etc.)
- **Inventory Management**: Real-time stock tracking with batch/expiry management
- **Multi-store Support**: Manage multiple store locations

### Advanced Features
- **Page Builder**: Shopify-style CMS with drag-and-drop page builder
- **Search & Filtering**: Advanced search with MeiliSearch integration
- **Caching**: Redis-based caching for optimal performance
- **Queue System**: Background job processing with BullMQ
- **File Storage**: AWS S3 integration for media management
- **Notifications**: Email, SMS, WhatsApp, and push notifications
- **Analytics**: Comprehensive analytics and reporting
- **API Gateway**: Rate limiting, authentication, and request routing

### Security & Compliance
- **Authentication**: JWT-based authentication with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: Advanced rate limiting with IP-based restrictions
- **Security Headers**: Helmet.js for security headers
- **Data Validation**: Joi-based request validation
- **Audit Logging**: Comprehensive audit trails

## 🏗️ Architecture

### Modular Monolith
- **Domain-driven Design**: Organized by business domains
- **Service Layer**: Business logic separation
- **Repository Pattern**: Data access abstraction
- **Event-driven**: Domain events with outbox pattern

### Technology Stack
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis
- **Search**: MeiliSearch
- **Queue**: BullMQ
- **Storage**: AWS S3
- **Monitoring**: Winston logging, Prometheus metrics

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Redis (v6 or higher)
- MeiliSearch (v0.30 or higher)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lenstrack-ecommerce
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start services**
   ```bash
   # Start MongoDB
   mongod

   # Start Redis
   redis-server

   # Start MeiliSearch
   meilisearch --master-key=masterKey
   ```

5. **Run the application**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/lenstrack_ecommerce` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | JWT secret key | Required |
| `AWS_S3_BUCKET` | S3 bucket name | Required |
| `MEILISEARCH_URL` | MeiliSearch URL | `http://localhost:7700` |

### Database Setup

The application will automatically create the necessary indexes on startup. For production, consider:

1. **Enable MongoDB authentication**
2. **Configure replica sets for high availability**
3. **Set up database backups**
4. **Configure connection pooling**

### Redis Configuration

1. **Enable Redis persistence**
2. **Configure memory limits**
3. **Set up Redis clustering for scalability**

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Available Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password

#### Products
- `GET /products` - List products
- `GET /products/:id` - Get product details
- `POST /products` - Create product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product

#### Orders
- `GET /orders` - List orders
- `GET /orders/:id` - Get order details
- `POST /orders` - Create order
- `PUT /orders/:id` - Update order
- `POST /orders/:id/cancel` - Cancel order

#### Pages (CMS)
- `GET /pages` - List pages
- `GET /pages/:id` - Get page details
- `POST /pages` - Create page
- `PUT /pages/:id` - Update page
- `DELETE /pages/:id` - Delete page
- `POST /pages/:id/publish` - Publish page

### API Documentation
Visit `http://localhost:3000/api/docs` for interactive API documentation.

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Test Data
The application includes seed data for development:
- Sample products
- Test users
- Example pages
- Mock orders

## 🚀 Deployment

### Docker Deployment

1. **Build Docker image**
   ```bash
   docker build -t lenstrack-ecommerce .
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

### Production Deployment

1. **Environment Setup**
   - Set `NODE_ENV=production`
   - Configure production database
   - Set up SSL certificates
   - Configure load balancer

2. **Security Configuration**
   - Enable HTTPS
   - Configure firewall rules
   - Set up monitoring
   - Enable audit logging

3. **Performance Optimization**
   - Enable Redis clustering
   - Configure MongoDB sharding
   - Set up CDN for static assets
   - Configure caching strategies

## 📊 Monitoring

### Health Checks
- `GET /health` - Application health
- `GET /ready` - Readiness check
- `GET /api` - API information

### Metrics
- Request/response times
- Error rates
- Database performance
- Cache hit rates
- Queue processing times

### Logging
- Structured JSON logging
- Request/response logging
- Error tracking
- Security event logging
- Business event logging

## 🔒 Security

### Authentication
- JWT-based authentication
- Refresh token rotation
- Account lockout protection
- Password strength requirements

### Authorization
- Role-based access control
- Permission-based access
- Store-based access control
- API key authentication

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation
- Review the API documentation

## 🔄 Changelog

### Version 1.0.0
- Initial release
- Core e-commerce functionality
- Page builder system
- Multi-store support
- Advanced search and filtering
- Comprehensive API
- Security and compliance features

---

**Built with ❤️ for the optical retail industry**
