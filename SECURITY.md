# Security — Day 10

TaskFlow is protected by PathHelm API Gateway.

## Architecture

All requests go through PathHelm (port 8000) before reaching TaskFlow (port 3000).

## Features

- API Key Authentication (X-Api-Key header required)
- Rate Limiting (5 requests/minute per client)
- IP Blacklisting & Whitelisting (admin controlled)
- AI Threat Detection (IsolationForest model)
- Live Analytics Dashboard (http://localhost:8501)

## Running the Gateway

cd C:\pathhelm
docker compose up --build

## PathHelm Repo

https://github.com/KingSajxxd/pathhelm.git