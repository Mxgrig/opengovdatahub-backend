# Deployment Guide

## Quick Deploy Options

### 1. Railway (Recommended)
1. Connect GitHub repo to Railway
2. Deploy automatically uses `railway.json` config
3. Set environment variables:
   - `JWT_SECRET` (generate secure random string)
   - `FRONTEND_URL=https://opengovdatahub.com`

### 2. Render
1. Connect GitHub repo to Render
2. Uses `render.yaml` configuration
3. Automatic deployments from main branch

### 3. Vercel
1. Connect GitHub repo to Vercel
2. Uses `vercel.json` configuration
3. Serverless deployment

### 4. GitHub Codespaces
1. Create Codespace from repository
2. Run `npm install && npm start`
3. Expose port 3000 as public
4. Use generated URL for backend

## Environment Variables

Required for production:
- `JWT_SECRET`: Secure random string for JWT signing
- `FRONTEND_URL`: https://opengovdatahub.com
- `NODE_ENV`: production

## Health Check

All platforms can use `/api/health` for health checks.

## CORS Configuration

The backend is configured to allow:
- https://opengovdatahub.com (production)
- http://localhost:5173 (development)
- http://localhost:3000 (development)

For other domains, update the CORS configuration in `complete-backend.js`.