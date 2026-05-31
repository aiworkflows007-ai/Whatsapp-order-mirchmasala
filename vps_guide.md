# Unified VPS Production Deployment & Operations Guide

This guide deploys the **Mirch Masala Restaurant Ordering System** on an Ubuntu VPS with Node.js, PostgreSQL, Nginx, PM2, and HTTPS.

---

## 1. Server Prerequisites

Connect to your VPS:
```bash
ssh root@<your-vps-ip-address>
```

Install Node.js, Nginx, Git, PostgreSQL, and PM2:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git postgresql postgresql-contrib
sudo npm install -g pm2
```

---

## 2. Create PostgreSQL Database

Create a database and app user:
```bash
sudo -u postgres psql
```

Inside PostgreSQL:
```sql
CREATE DATABASE mirch_masala;
CREATE USER mirch_user WITH PASSWORD 'change_this_strong_password';
GRANT ALL PRIVILEGES ON DATABASE mirch_masala TO mirch_user;
\q
```

Your production database URL will look like:
```env
DATABASE_URL="postgresql://mirch_user:change_this_strong_password@localhost:5432/mirch_masala"
```

---

## 3. Configure App Environment

Clone the app:
```bash
cd /var/www
git clone <your-repository-url> mirch-masala
cd mirch-masala
nano .env
```

Minimum production `.env`:
```env
NODE_ENV="production"
DATABASE_URL="postgresql://mirch_user:change_this_strong_password@localhost:5432/mirch_masala"
SESSION_SECRET="use-a-random-secret-at-least-32-characters-long"
SEED_OWNER_PASSWORD="change-this-after-first-login"

NEXT_PUBLIC_APP_URL="https://your-domain.com"

WHATSAPP_PHONE_NUMBER_ID="your_real_phone_number_id"
WHATSAPP_BUSINESS_ACCOUNT_ID="your_real_business_account_id"
WHATSAPP_ACCESS_TOKEN="your_real_meta_access_token"
WHATSAPP_VERIFY_TOKEN="your_private_meta_verify_token"
WHATSAPP_APP_SECRET="your_real_meta_app_secret"
WHATSAPP_MODE="real"

RAZORPAY_KEY_ID="your_real_razorpay_key_id"
RAZORPAY_KEY_SECRET="your_real_razorpay_key_secret"
RAZORPAY_WEBHOOK_SECRET="your_real_razorpay_webhook_secret"

AI_PROVIDER="gemini"
AI_API_KEY="your_real_ai_key"
AI_MODEL="gemini-2.5-flash-lite"
AI_ASSISTANT_NAME="Chef Sanjay AI"
AI_ENABLED="true"
AI_FALLBACK_TO_RULE_BASED="true"
```

Never upload `.env` to GitHub.

---

## 4. Install, Migrate, Seed, Build

```bash
npm install
npx prisma migrate deploy
npx prisma db seed
npm run build
npm prune --omit=dev
```

Default owner login:
- Username: `admin`
- Password: value of `SEED_OWNER_PASSWORD`

Change the owner password after first login.

---

## 5. Run With PM2

```bash
pm2 start ecosystem.config.js
pm2 status
pm2 save
pm2 startup
```

Run the command printed by `pm2 startup`.

---

## 6. Configure Nginx And HTTPS

Copy and edit the Nginx config:
```bash
sudo cp nginx.conf /etc/nginx/sites-available/mirch-masala
sudo nano /etc/nginx/sites-available/mirch-masala
sudo ln -s /etc/nginx/sites-available/mirch-masala /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Install HTTPS:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

WhatsApp and Razorpay live webhooks should use HTTPS URLs only.

---

## 7. Deploy Updates

```bash
chmod +x deploy.sh
./deploy.sh
```

The script pulls latest code, installs packages, applies Prisma migrations, seeds data, builds Next.js, and reloads PM2.

---

## 8. PostgreSQL Backup

Create a backup:
```bash
pg_dump "postgresql://mirch_user:change_this_strong_password@localhost:5432/mirch_masala" > mirch_masala_backup.sql
```

Restore a backup:
```bash
psql "postgresql://mirch_user:change_this_strong_password@localhost:5432/mirch_masala" < mirch_masala_backup.sql
```
