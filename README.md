
## 🌍 Live Deployment

TaskFlow is live on AWS!

| Service | URL |
|---------|-----|
| API | http://13.53.175.231:3000 |
| Swagger Docs | http://13.53.175.231:3000/api-docs |
| Health Check | http://13.53.175.231:3000/ |

## ☁️ AWS Infrastructure

| Service | Details |
|---------|---------|
| EC2 | t3.micro - Ubuntu 24.04 LTS |
| RDS | PostgreSQL 17.6 - db.t3.micro |
| S3 | taskflow-user-uploads (eu-north-1) |
| Region | eu-north-1 (Stockholm) |

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

| Service | Purpose               | Type                    |
| ------- | --------------------- | ----------------------- |
| EC2     | Application server    | t2.micro (Free Tier)    |
| RDS     | PostgreSQL database   | db.t3.micro (Free Tier) |
| S3      | File storage          | 5GB (Free Tier)         |
| IAM     | Secure access control | taskflow-admin user     |
| Budgets | Billing protection    | Zero spend alarm        |

| S3 | File storage (user uploads) | taskflow-user-uploads bucket |
