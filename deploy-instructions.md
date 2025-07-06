# Quick Deployment Instructions

## Option 1: One-Click Deploy (Recommended)

Click any of these buttons to deploy instantly:

### Railway (Best for APIs)
1. Go to: https://railway.app/new
2. Select "Deploy from GitHub repo"
3. Choose: `Mxgrig/opengovdatahub-backend`
4. Railway will auto-detect and deploy!

### Render (Free tier available)
1. Go to: https://render.com/deploy?repo=https://github.com/Mxgrig/opengovdatahub-backend
2. Click "Deploy to Render"
3. Configure environment variables:
   - `JWT_SECRET`: `opengovdatahub-production-jwt-2024`
   - `FRONTEND_URL`: `https://opengovdatahub.com`

### Vercel (Serverless)
1. Go to: https://vercel.com/new/clone?repository-url=https://github.com/Mxgrig/opengovdatahub-backend
2. Click "Deploy"
3. Add environment variables in dashboard

## Option 2: GitHub Codespaces (Free)

1. Go to: https://github.com/Mxgrig/opengovdatahub-backend
2. Click the green "Code" button
3. Click "Create codespace on main"
4. Wait for setup (auto-installs and starts server)
5. When prompted, make port 3000 public
6. Use the generated URL as your backend

## Option 3: Local Development

```bash
git clone https://github.com/Mxgrig/opengovdatahub-backend
cd opengovdatahub-backend
npm install
npm start
```

## After Deployment

1. Get your backend URL (e.g., `https://yourapp.railway.app`)
2. Test health: `https://yourapp.railway.app/api/health`
3. Update frontend environment variable: `VITE_BACKEND_URL`

## Environment Variables Needed

- `JWT_SECRET`: Secure random string
- `FRONTEND_URL`: `https://opengovdatahub.com`
- `NODE_ENV`: `production`

## Health Check Endpoint

All platforms can use `/api/health` for monitoring.