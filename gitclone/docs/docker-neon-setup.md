# GitClone Docker & Neon PostgreSQL Deployment Guide

This guide explains how to package and run the **GitClone** application as a single Docker container connected to **Neon PostgreSQL** and authenticated with a **Single Shared GitHub Personal Access Token (PAT)** for multi-user access at runtime.

---

## 🔒 Security Principles

1. **Zero Secret Baking**: The Docker image `ghcr.io/sanjay222-r/githubapp:latest` contains **NO** credentials, database URLs, or GitHub tokens in its image layers.
2. **Runtime Injection**: All secrets are injected dynamically at runtime via Docker environment flags (`-e`) or an uncommitted `.env` file.
3. **Repository Safety**: `.gitignore` strictly excludes all `.env` files and certificates.
4. **Token Encryption**: Stored tokens in Neon PostgreSQL are encrypted using AES-256-GCM. Raw PATs are never sent to client web browsers.

---

## 📋 Prerequisites

1. **Neon PostgreSQL Database**:
   - Create a free database at [neon.tech](https://neon.tech).
   - Copy your connection string (`postgresql://neondb_owner:password@ep-...neon.tech/neondb?sslmode=require`).
2. **GitHub Personal Access Token (PAT)**:
   - Generate a token at [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens).
   - Scopes required: `repo`, `user`, `read:org`.
3. **Docker** installed on your host machine / server.

---

## 🚀 Quick Start (Running with Docker)

### Step 1: Create your local `.env` file
Create a file named `.env` on your server/machine:

```env
DATABASE_URL=postgresql://neondb_owner:YOUR_NEON_PASSWORD@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
GITHUB_PAT=ghp_yourPersonalAccessTokenHere
SESSION_SECRET=a_random_32_character_string_for_sessions_123456
TOKEN_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

### Step 2: Run the Docker Container

#### Option A: Pull and run from GitHub Container Registry
```bash
docker run -d \
  --name gitclone \
  -p 8787:8787 \
  --env-file .env \
  ghcr.io/sanjay222-r/githubapp:latest
```

#### Option B: Build and run locally with Docker Compose
```bash
docker compose --env-file .env up -d --build
```

### Step 3: Access the Application
Open your browser and navigate to:
```
http://localhost:8787
```

All individuals accessing the application will immediately share access to the GitHub account context for browsing repositories, creating/editing files, and committing changes.

---

## 🛠️ Automated CI/CD Publishing

When changes are pushed to the `main` or release branch, the GitHub Action workflow `.github/workflows/docker-publish.yml` automatically builds the multi-stage Docker image and publishes it to GitHub Packages Container Registry (`ghcr.io`).

---

## 🔍 Health Check & Diagnostics

- **Health Check Endpoint**: `GET http://localhost:8787/api/health`
- **Check Container Logs**:
  ```bash
  docker logs -f gitclone
  ```
