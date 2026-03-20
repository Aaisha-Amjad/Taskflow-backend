## 🏗️ Architecture
```
Client Request
     ↓
PathHelm Gateway (port 8000)
     ↓  Rate Limiting, AI Detection, API Key Auth
TaskFlow API (port 3000)
     ↓
PostgreSQL Database
```

## 🚀 Deployment (AWS)

### Prerequisites
- AWS Account
- Docker installed on EC2
- PostgreSQL on AWS RDS

### Production Setup
1. Launch EC2 instance (t2.micro - Free Tier)
2. Launch RDS PostgreSQL (db.t3.micro - Free Tier)
3. Clone repo on EC2:
```bash
   git clone https://github.com/Aaisha-Amjad/Taskflow-backend.git
```
4. Create `.env` file with RDS credentials
5. Run production stack:
```bash
   docker compose -f docker-compose.prod.yml up -d
```

### Environment Variables
See `.env.example` for all required variables.

## 🛡️ Security
See `SECURITY.md` for full security documentation.


## ☁️ AWS Infrastructure

| Service | Purpose | Type |
|---------|---------|------|
| EC2 | Application server | t2.micro (Free Tier) |
| RDS | PostgreSQL database | db.t3.micro (Free Tier) |
| S3 | File storage | 5GB (Free Tier) |
| IAM | Secure access control | taskflow-admin user |
| Budgets | Billing protection | Zero spend alarm |