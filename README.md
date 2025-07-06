# OpenGov DataHub Backend

A zero-cost Firebase alternative providing JWT authentication, file-based storage, and full-text search for the OpenGov DataHub project.

## 🚀 Features

- **JWT Authentication** - Secure user management
- **File-Based Storage** - No database required
- **Full-Text Search** - TF-IDF algorithm for government data
- **API Caching** - Intelligent caching of external API calls
- **Email Verification** - User registration with email confirmation
- **Rate Limiting** - API protection and abuse prevention

## 🔗 API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/search` - Search government data
- `GET /api/data` - Access cached government APIs

## 🌐 Production

- **Frontend**: https://opengovdatahub.com (Hostinger)
- **Backend**: https://api.opengovdatahub.com (Railway)

## 🚀 Deploy

### 📋 Quick Deploy Instructions:

1. **Railway** (Recommended): Go to [railway.app/new](https://railway.app/new) → Deploy from GitHub → Select this repo
2. **Render**: Click [Deploy to Render](https://render.com/deploy?repo=https://github.com/Mxgrig/opengovdatahub-backend)
3. **Vercel**: Click [Deploy with Vercel](https://vercel.com/new/clone?repository-url=https://github.com/Mxgrig/opengovdatahub-backend)
4. **Codespaces**: Go to this repo → Code → Create codespace → Auto-deploys with public URL

### 🔧 Environment Variables (Set in deployment platform):
```
JWT_SECRET=opengovdatahub-production-jwt-2024
FRONTEND_URL=https://opengovdatahub.com
NODE_ENV=production
```

### ✅ Test Deployment:
Once deployed, test: `https://your-app-url.com/api/health`

## 🛠️ Development

```bash
npm install
npm run dev
```

Server runs on http://localhost:3001

## 📊 Government Data Sources

- UK Police API (crime statistics)
- Planning.data.gov.uk (planning applications)
- Data.gov.uk CKAN API (council spending)
- Postcodes.io (geographic data)

Built to replace Firebase and solve authentication/search issues.