#!/bin/bash

# Exit immediately if any command returns a non-zero status
set -e

# Formatting console colors
ORANGE='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${ORANGE}=======================================================================${NC}"
echo -e "${ORANGE}      MIRCH MASALA RESTAURANT - LIVE PRODUCTION DEPLOYMENT SCRIPT      ${NC}"
echo -e "${ORANGE}=======================================================================${NC}"
echo ""

# 1. Pull latest code from production branch
echo "📥 [1/5] Fetching latest codebase from git repository..."
if [ -d .git ]; then
    git pull
    echo -e "${GREEN}✔️ Git pull complete.${NC}"
else
    echo -e "${ORANGE}⚠️ Skipping git pull (Not a git repository).${NC}"
fi
echo ""

# 2. Install dependencies safely
echo "📦 [2/5] Installing node dependencies..."
npm install
echo -e "${GREEN}✔️ Dependencies installed successfully.${NC}"
echo ""

# 3. Run migrations and seed data
echo "🗃️ [3/5] Syncing database schemas and applying migrations..."
npx prisma migrate deploy
npx prisma db seed
echo -e "${GREEN}✔️ Prisma PostgreSQL migrations and seed applied.${NC}"
echo ""

# 4. Compile Next.js production bundle
echo "🏗️ [4/5] Compiling Next.js production build bundle..."
npm run build
npm prune --omit=dev
echo -e "${GREEN}✔️ Next.js compilation successfully completed.${NC}"
echo ""

# 5. Gracefully reload PM2 processes
echo "🔄 [5/5] Reloading PM2 background server process..."
if pm2 list | grep -q "mirch-masala-restaurant"; then
    pm2 reload ecosystem.config.js
    echo -e "${GREEN}✔️ PM2 graceful reload successful - Zero downtime deployment!${NC}"
else
    pm2 start ecosystem.config.js
    echo -e "${GREEN}✔️ PM2 process started and online!${NC}"
fi

echo ""
echo -e "${ORANGE}=======================================================================${NC}"
echo -e "${GREEN}⭐ SUCCESS: Live deployment finished successfully! System online. ${NC}"
echo -e "${ORANGE}=======================================================================${NC}"
