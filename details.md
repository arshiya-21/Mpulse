# MPulse — Deployment & Technical Reference

---

## Database Schema

The schema lives in `database/schema.sql`. PostgreSQL auto-runs it when the Docker DB container starts for the first time (mounted to `/docker-entrypoint-initdb.d/`).

### Tables

| Table | Purpose |
|-------|---------|
| `departments` | Company departments |
| `roles` | Admin / Manager / User |
| `employees` | All users — login credentials, role, department |
| `employee_managers` | Many-to-many: employee ↔ their managers |
| `projects` | Client and internal projects |
| `tasks` | Daily work log entries (one per employee per day per project) |
| `licenses` | Software/service license types |
| `customers` | Customer list, linked to licenses |
| `customer_visits` | Scheduled visits to customers |
| `system_settings` | Single-row config: daily target, timezone, TAT alert, etc. |
| `email_settings` | Single-row Gmail SMTP config (from_email + app_password) |
| `library_sections` | Video library folders |
| `library_videos` | YouTube video entries (stores video_id, label, caption) |
| `role_permissions` | Per-role, per-page: can_view / can_create / can_update / can_delete |

### Key column notes
- `tasks.utilization` = `(spent_mins / daily_target_mins) * 100` — calculated on save
- `tasks.tat_days` = days past `project.end_date` at time of logging — calculated on save
- `customer_visits.channel` allowed values: `Email`, `WhatsApp`, `Phone Call`, `SMS`, `On-Site Request`
- `customer_visits.status` allowed values: `Planned`, `In Progress`, `Completed`, `Pending`, `Rescheduled`, `Cancelled`
- `employees.invite_status`: `pending` = first login triggers password-reset flow, `accepted` = normal login

---

## seed.js

`database/seed.js` creates the minimum required data so the app works after a fresh DB:
- 3 roles: Admin, Manager, User
- 1 department: Administration
- 1 system_settings row
- 1 email_settings placeholder row
- 1 admin user: `admin@mpulse.com` / `Admin@1234`
- Library section + 6 videos
- All default role permissions

Run it once after the DB is up:
```bash
node database/seed.js
```

The `migrate.js` file inside `backend/src/` runs automatically every time the backend starts. It creates any missing tables and adds missing columns — safe to run repeatedly.

---

---

# Deployment Guide

## Option A — Free Deployment with Railway (Recommended for Beginners)

Railway is the easiest platform for deploying a Docker-based app for free. It connects to GitHub and auto-deploys on every push.

**Free tier:** 500 hours/month (enough for one always-on app), 1 GB RAM, 1 GB PostgreSQL.

### Step 1 — Push code to GitHub

On your computer:
```bash
git add .
git commit -m "ready for deployment"
git push origin master
```

---

### Step 2 — Create Railway account

Go to railway.app and sign up with GitHub.

---

### Step 3 — Create a new project on Railway

1. Click **New Project**
2. Select **Deploy from GitHub repo**
3. Select your `mpulse` repository
4. Railway will detect the project

---

### Step 4 — Add PostgreSQL database

1. In your Railway project, click **New** → **Database** → **PostgreSQL**
2. Railway creates a PostgreSQL instance and gives you a `DATABASE_URL`
3. Click on the PostgreSQL service → **Variables** → copy the `DATABASE_URL` value

---

### Step 5 — Configure the Backend service

1. Click your main service → **Settings** → **Build**
2. Set **Root Directory** to `backend`
3. Set **Dockerfile Path** to `backend/Dockerfile`

Go to **Variables** and add:
```
DATABASE_URL     = (paste from step 4)
JWT_SECRET       = (run: openssl rand -hex 32)
JWT_EXPIRES_IN   = 24h
CORS_ORIGIN      = https://your-frontend.up.railway.app
PORT             = 4000
NODE_ENV         = production
```

---

### Step 6 — Configure the Frontend service

1. Click **New** → **GitHub Repo** → same repo
2. Settings → **Root Directory** = `frontend`
3. Settings → **Dockerfile Path** = `frontend/Dockerfile`

Go to **Variables** and add:
```
VITE_API_URL = /api
```

---

### Step 7 — Update CORS

Once both services are deployed, copy the frontend URL (e.g. `https://mpulse-frontend.up.railway.app`) and update the backend variable:
```
CORS_ORIGIN = https://mpulse-frontend.up.railway.app
```

---

### Step 8 — Initialize the database

Railway gives you a direct connection URL. Run the seed script once from your computer:

```bash
cd database
DATABASE_URL="(paste your Railway DATABASE_URL here)" node seed.js
```

Or open Railway → PostgreSQL → **Query** tab and paste the contents of `database/schema.sql` to run it manually.

---

### Step 9 — Add your custom domain

1. Railway → your frontend service → **Settings** → **Domains**
2. Click **Custom Domain** → enter `yourdomain.com`
3. Railway shows you a CNAME record to add in your DNS
4. In your domain registrar add: `CNAME @ → railway-provided-value`
5. Update backend `CORS_ORIGIN` to `https://yourdomain.com`

SSL (HTTPS) is automatic on Railway — no certbot needed.

---

### Update after code changes

```bash
git add .
git commit -m "your change"
git push origin master
```

Railway auto-deploys within 2–3 minutes. Done.

---

---

## Option B — Free VPS with Oracle Cloud (Always Free Tier)

Oracle Cloud gives a permanently free VM (1 OCPU, 1 GB RAM, Ubuntu). You own it, no time limits.

### Step 1 — Create Oracle Cloud account

Go to cloud.oracle.com → Sign Up → select **Always Free** resources.

### Step 2 — Create a VM instance

1. Compute → Instances → Create Instance
2. Shape: **VM.Standard.E2.1.Micro** (Always Free)
3. OS: **Ubuntu 22.04**
4. Download your SSH key pair
5. Click Create

### Step 3 — Open ports in Security List

Networking → Virtual Cloud Networks → your VCN → Security Lists → Default → Add Ingress Rules:

| Source CIDR | Protocol | Port |
|-------------|----------|------|
| 0.0.0.0/0   | TCP      | 80   |
| 0.0.0.0/0   | TCP      | 443  |

### Step 4 — SSH into the server

```bash
ssh -i your-private-key.key ubuntu@YOUR_ORACLE_IP
```

### Step 5 — Install Docker

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
sudo apt install -y docker-compose-plugin certbot
```

### Step 6 — Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/mpulse.git
cd mpulse
cp .env.example .env
nano .env
```

Fill in `.env`:
```
DB_NAME=task_tracker
DB_USER=tracker_user
DB_PASS=ChooseAStrongPassword123!
JWT_SECRET=paste-64-random-chars-here
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://yourdomain.com
```

Generate JWT_SECRET:
```bash
openssl rand -hex 32
```

### Step 7 — Point domain to server

In your DNS registrar add:
```
A  @    YOUR_ORACLE_IP
A  www  YOUR_ORACLE_IP
```
Wait 5–10 minutes.

### Step 8 — Get SSL certificate

```bash
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your@email.com \
  --agree-tos --no-eff-email
```

### Step 9 — Update nginx.conf with your domain

Edit `frontend/nginx.conf` — replace `yourdomain.com` in all 4 places:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    root /usr/share/nginx/html;
    index index.html;
    client_max_body_size 20M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location /api/ {
        proxy_pass         http://backend:4000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto https;
        proxy_read_timeout 60s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Step 10 — Build and run

```bash
cd ~/mpulse
docker compose -f docker-compose.prod.yml up -d --build
```

Check everything is running:
```bash
docker compose -f docker-compose.prod.yml ps
```

Visit `https://yourdomain.com` — login with `admin@mpulse.com` / `Admin@1234`.

### Step 11 — Auto-renew SSL

```bash
sudo crontab -e
# Add:
0 3 1 * * certbot renew --quiet && cd /home/ubuntu/mpulse && docker compose -f docker-compose.prod.yml restart frontend
```

### Update after code changes

```bash
# On your computer:
git push origin master

# On the Oracle server:
cd ~/mpulse
git pull origin master
docker compose -f docker-compose.prod.yml up -d --build frontend backend
```

---

## Useful Commands (for VPS/Oracle deployment)

```bash
# See running containers
docker compose -f docker-compose.prod.yml ps

# See backend logs live
docker compose -f docker-compose.prod.yml logs -f backend

# Restart all
docker compose -f docker-compose.prod.yml restart

# Backup database
docker exec mpulse-db pg_dump -U tracker_user task_tracker > backup_$(date +%F).sql

# Restore backup
cat backup_2026-04-16.sql | docker exec -i mpulse-db psql -U tracker_user -d task_tracker

# Open DB shell
docker exec -it mpulse-db psql -U tracker_user -d task_tracker
```

---

## Files You Must Edit Before Deploying (VPS only)

| File | What to change |
|------|---------------|
| `frontend/nginx.conf` | Replace all 4 `yourdomain.com` with your actual domain |
| `.env` (on server) | `DB_PASS`, `JWT_SECRET`, `CORS_ORIGIN` |
| certbot command | `-d yourdomain.com` with your domain |

Railway handles all of this automatically through its dashboard.
