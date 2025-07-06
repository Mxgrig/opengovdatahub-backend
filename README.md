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

### One-Click Deploy Options:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Mxgrig/opengovdatahub-backend)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Mxgrig/opengovdatahub-backend)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template?template=https://github.com/Mxgrig/opengovdatahub-backend)

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