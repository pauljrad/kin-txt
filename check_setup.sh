#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "═══════════════════════════════════════════════════════════════"
echo "  KiN-TXT Email Notification Setup Checker"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if .env file exists
echo -e "${BLUE}Checking local environment...${NC}"
if [ -f .env ] || [ -f .env.local ]; then
    echo -e "${GREEN}✓${NC} Environment file found"
    SUPABASE_URL=$(grep VITE_SUPABASE_URL .env .env.local 2>/dev/null | head -1 | cut -d '=' -f 2 | tr -d '"')
    PROJECT_ID=$(grep VITE_SUPABASE_PROJECT_ID .env .env.local 2>/dev/null | head -1 | cut -d '=' -f 2 | tr -d '"')
    echo -e "  Project ID: ${YELLOW}${PROJECT_ID}${NC}"
    echo -e "  URL: ${YELLOW}${SUPABASE_URL}${NC}"
else
    echo -e "${RED}✗${NC} No environment file found"
fi
echo ""

# Check if functions exist
echo -e "${BLUE}Checking Edge Functions...${NC}"
if [ -f "supabase/functions/notify-admin-signup/index.ts" ]; then
    echo -e "${GREEN}✓${NC} notify-admin-signup function exists"
else
    echo -e "${RED}✗${NC} notify-admin-signup function missing"
fi

if [ -f "supabase/functions/send-welcome-email/index.ts" ]; then
    echo -e "${GREEN}✓${NC} send-welcome-email function exists"
else
    echo -e "${RED}✗${NC} send-welcome-email function missing"
fi
echo ""

# Check if config.toml is updated
echo -e "${BLUE}Checking configuration...${NC}"
if grep -q "notify-admin-signup" supabase/config.toml; then
    echo -e "${GREEN}✓${NC} notify-admin-signup configured in config.toml"
else
    echo -e "${RED}✗${NC} notify-admin-signup not in config.toml"
fi

if grep -q "send-welcome-email" supabase/config.toml; then
    echo -e "${GREEN}✓${NC} send-welcome-email configured in config.toml"
else
    echo -e "${RED}✗${NC} send-welcome-email not in config.toml"
fi
echo ""

# Check if Login.tsx is updated
echo -e "${BLUE}Checking frontend code...${NC}"
if grep -q "notify-admin-signup" src/pages/Login.tsx; then
    echo -e "${GREEN}✓${NC} Login.tsx calls notify-admin-signup"
else
    echo -e "${RED}✗${NC} Login.tsx missing notify-admin-signup call"
fi

if grep -q "send-welcome-email" src/pages/Login.tsx; then
    echo -e "${GREEN}✓${NC} Login.tsx calls send-welcome-email"
else
    echo -e "${RED}✗${NC} Login.tsx missing send-welcome-email call"
fi
echo ""

# Manual checks needed
echo "═══════════════════════════════════════════════════════════════"
echo -e "${YELLOW}MANUAL CHECKS NEEDED (in Supabase Dashboard):${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Go to: https://supabase.com/dashboard/project/${PROJECT_ID}"
echo ""
echo "□ Edge Functions → Manage secrets"
echo "  └─ Check RESEND_API_KEY is set"
echo "  └─ Check ADMIN_EMAIL is set"
echo ""
echo "□ Edge Functions"
echo "  └─ Check 'notify-admin-signup' is deployed"
echo "  └─ Check 'send-welcome-email' is deployed"
echo ""
echo "□ Authentication → Settings"
echo "  └─ 'Enable email confirmations' is turned ON"
echo "  └─ Site URL is set to your production URL"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "${BLUE}Next Steps:${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "1. Complete the manual checks above"
echo "2. See SETUP_GUIDE.md for detailed instructions"
echo "3. See QUICK_START.txt for a quick checklist"
echo "4. Test by signing up at: https://marvelous-cendol-1331d6.netlify.app"
echo ""
echo "═══════════════════════════════════════════════════════════════"
