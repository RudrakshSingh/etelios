# Lenstrack Training App - Micro-learning Platform

## 🎯 **Overview**

A comprehensive micro-learning platform designed for Lenstrack's sales associates, optometrists, and store managers. Built with open-source technologies and cost-effective architecture.

## 🚀 **Features**

### 📚 **Learning Tracks**
- **Sales Track (S1-S8)**: 7-Step Retail Flow, Product 101, Lens Advisor, Offers & Compliance, Objection Handling, Attach & Cross-sell, CRM & Follow-ups, Mystery Shopper Sim
- **Optometrist Track (O1-O8)**: Case History, Refraction Workflow, Measurements, Progressives, Troubleshooting, Lens Selection, Pediatric & CL Basics, Lab Form & QC

### 🤖 **AI-Powered Learning**
- **Rasa Integration**: Natural language dialogue management
- **LLM Integration**: Llama-3-8b-instruct for role-play scenarios and feedback
- **AI Role-play**: Realistic customer scenarios with rubric scoring
- **Adaptive Learning**: Personalized content based on performance

### 🎮 **Gamification**
- **XP System**: Points for completion, perfect scores, first attempts
- **Badges**: AR-Champ, AOV-Ace, Progressive-Pro, PD-Pro, Remake-Zero
- **Streaks**: Daily learning streaks with freeze functionality
- **Leaderboards**: Store-wise and company-wide rankings

### 📊 **Analytics & KPIs**
- **Real-time KPIs**: AR attach rate, progressive conversion, remake rate
- **Performance Tracking**: Individual and store-level analytics
- **Skill Gap Analysis**: Heatmap visualization of learning needs
- **Training Impact**: ROI analysis and performance improvement metrics

### 🔗 **ERP Integration**
- **Etelios ERP**: Real-time KPI synchronization
- **Certification Tracking**: Automatic certification updates
- **Performance Validation**: KPI-based badge awarding
- **Training Recommendations**: AI-driven learning paths

## 🏗️ **Architecture**

### **Backend Stack**
- **Node.js/Express**: RESTful API server
- **MongoDB**: Document database for learning content
- **PostgreSQL + pgvector**: Vector database for RAG
- **Redis**: Caching and session management
- **Rasa**: Dialogue management
- **Llama-3-8b**: LLM for content generation

### **Frontend Stack**
- **React Native**: Cross-platform mobile app
- **Offline-first**: SQLite with background sync
- **Real-time**: Socket.io for live updates

### **AI Services**
- **Rasa**: Intent recognition and dialogue flows
- **Llama-3-8b**: Content generation and feedback
- **Whisper**: Speech-to-text for voice interactions
- **Coqui-TTS**: Text-to-speech for audio content

## 📁 **Project Structure**

```
lenstrack-training-app/
├── src/
│   ├── models/           # Database models
│   ├── services/         # Business logic
│   ├── controllers/      # API controllers
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication, validation
│   └── data/            # Learning content
├── rasa/                # Rasa dialogue management
├── client/              # React Native app
├── scripts/             # Setup and utility scripts
└── docs/               # Documentation
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- MongoDB
- PostgreSQL
- Redis
- Python 3.8+ (for Rasa and LLM)

### **Installation**

1. **Clone and Install**
```bash
git clone <repository-url>
cd lenstrack-training-app
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database Setup**
```bash
# MongoDB
mongod

# PostgreSQL
createdb lenstrack_training
npm run db:migrate
```

4. **AI Services Setup**
```bash
# Rasa
cd rasa
rasa train
rasa run --enable-api --cors '*'

# LLM (Llama-3-8b)
python scripts/setup_llm.py
```

5. **Start Services**
```bash
# Backend
npm start

# Rasa (separate terminal)
cd rasa && rasa run --enable-api --cors '*'

# LLM (separate terminal)
python scripts/run_llm.py
```

## 📱 **Mobile App**

### **React Native Setup**
```bash
cd client
npm install
npx react-native run-android
# or
npx react-native run-ios
```

### **Offline Support**
- SQLite for local data storage
- Background sync with server
- Offline lesson access
- Progress tracking

## 🎓 **Learning Modules**

### **Sales Track (S1-S8)**
1. **S1 - 7-Step Retail Flow**: Greet → Probe → Demonstrate → Recommend → Close → Bill → Aftercare
2. **S2 - Product 101**: Frame materials, shapes, hinges, sunglasses basics
3. **S3 - Lens Advisor Lite**: SV vs Progressive vs Office, coatings (AR, BlueCut, Drive)
4. **S4 - Offers & Compliance**: Zeiss/Kodak promos, eligibility, T&Cs, invoice compliance
5. **S5 - Objection Handling**: Price, time, spouse, brand objections, EMI/step-down close
6. **S6 - Attach & Cross-sell**: Cases/cleaners, power sunglasses, CL trials, service plans
7. **S7 - CRM & Follow-ups**: WhatsApp scripts, recalls, reviews, referrals
8. **S8 - Mystery Shopper Sim**: Multi-scenario AI role-play with rubric scoring

### **Optometrist Track (O1-O8)**
1. **O1 - Case History & Red Flags**: Symptoms triage, decision tree
2. **O2 - Refraction Workflow**: Subjective, duochrome, binocular balance
3. **O3 - Measurements**: Mono-PD, seg height, pantoscopic tilt, wrap, SH pitfalls
4. **O4 - Progressives**: Corridor choice, frame selection rules, adaptation counsel
5. **O5 - Troubleshooting**: Non-adapt matrix, Rx recheck SOP, prism flags
6. **O6 - Lens Selection Matrix**: Index, material, coatings by Rx & lifestyle
7. **O7 - Pediatric & CL Basics**: Contraindications, hygiene protocol
8. **O8 - Lab Form & QC**: Rx transcription, tolerances, remake-prevention

## 🎮 **Gamification System**

### **XP Rewards**
- Lesson completion: 50 XP
- Perfect score: 25 XP
- First attempt: 15 XP
- Streak bonus: 5 XP per day
- Daily goal: 10 XP
- Weekly goal: 50 XP

### **Badges**
- **AR-Champ**: 25%+ AR attach rate
- **AOV-Ace**: Exceed store median AOV
- **Progressive-Pro**: 20%+ progressive conversion
- **PD-Pro**: Zero PD measurement errors
- **Remake-Zero**: 2% or less remake rate

### **Leaderboards**
- Store-wise rankings
- Company-wide leaderboard
- Weekly/monthly competitions
- Role-based categories

## 📊 **Analytics Dashboard**

### **Individual Analytics**
- Progress tracking
- Performance trends
- Skill gap analysis
- KPI achievements

### **Store Analytics**
- Team performance
- Training completion rates
- Certification status
- ROI analysis

### **Company Analytics**
- Learning trends
- Skill gap heatmaps
- Training impact
- Cost-benefit analysis

## 🔗 **ERP Integration**

### **Real-time KPIs**
- AR attach rate
- Progressive conversion
- Remake rate
- AOV performance

### **Certification Tracking**
- Automatic updates
- Expiry notifications
- Renewal reminders
- Compliance reporting

### **Performance Validation**
- KPI-based badge awarding
- Training recommendations
- Skill gap identification
- Impact measurement

## 🛠️ **Development**

### **API Endpoints**
- `/api/auth` - Authentication
- `/api/tracks` - Learning tracks
- `/api/lessons` - Lesson content
- `/api/simulations` - AI role-play
- `/api/gamification` - XP, badges, leaderboards
- `/api/analytics` - Performance analytics
- `/api/admin` - Admin functions

### **Database Models**
- `User` - User profiles and gamification
- `LearningTrack` - Track definitions
- `Lesson` - Lesson content and structure
- `UserProgress` - Progress tracking
- `Assessment` - Quiz and evaluation data

### **Services**
- `RasaService` - Dialogue management
- `LLMService` - Content generation
- `GamificationService` - XP and badges
- `AnalyticsService` - Performance analytics
- `ERPIntegrationService` - ERP synchronization

## 📈 **Business Impact**

### **Expected Outcomes**
- ↑ AOV (Average Order Value)
- ↑ Attach rate (AR/BlueCut/Drive)
- ↑ Progressive conversion
- ↓ Remake rate
- ↑ NPS (Net Promoter Score)
- ↑ Close rate

### **ROI Metrics**
- Training investment tracking
- Performance improvement measurement
- Cost-benefit analysis
- Skill gap reduction

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/lenstrack_training
POSTGRES_URL=postgresql://localhost:5432/lenstrack_training
REDIS_URL=redis://localhost:6379

# AI Services
RASA_URL=http://localhost:5005
LLM_URL=http://localhost:8000
LLM_MODEL=llama-3-8b-instruct

# ERP Integration
ERP_URL=http://localhost:3001
ERP_API_KEY=your_api_key

# App Configuration
PORT=3002
NODE_ENV=development
```

## 📚 **Documentation**

- [API Documentation](./docs/api.md)
- [Learning Content Guide](./docs/content.md)
- [Gamification System](./docs/gamification.md)
- [Analytics Dashboard](./docs/analytics.md)
- [ERP Integration](./docs/erp-integration.md)

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 **License**

MIT License - see [LICENSE](./LICENSE) for details.

## 🆘 **Support**

For support and questions:
- Email: training@lenstrack.com
- Documentation: [docs.lenstrack.com](https://docs.lenstrack.com)
- Issues: [GitHub Issues](https://github.com/lenstrack/training-app/issues)

---

**Built with ❤️ for Lenstrack Team**
