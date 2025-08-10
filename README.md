# REsultats BAC 

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/medebbe27-3994s-projects/v0-web-app-with-excel-data-c4)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/I5CS43fkmOO)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

### AWS Lambda + DynamoDB (Serverless Framework)

Quick steps (CloudShell):
1. Clone repo
2. cp env.production.example .env
3. Adjust env vars (FEATURE_DYNAMO=true, DYNAMO_TABLE, AWS_REGION)
4. Install deps: pnpm install (install pnpm first if missing)
5. Deploy: pnpm deploy:lambda
6. (Optional) Migrate legacy data: pnpm migrate:dynamo <year> <examType> [sessionType]

Table + GSIs are auto-provisioned from serverless.yml first deploy (PAY_PER_REQUEST).

Rollback: serverless remove (or set FEATURE_DYNAMO=false to fallback if Prisma still present).

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/I5CS43fkmOO](https://v0.dev/chat/projects/I5CS43fkmOO)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
