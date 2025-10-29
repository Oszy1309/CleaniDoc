# Environment Variables Setup Guide

This guide explains how to properly configure environment variables for the CleaniDoc Dashboard.

## 🔧 Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local` with your actual values:**
   ```bash
   nano .env.local
   ```

3. **Never commit `.env.local` to git** (it's already in `.gitignore`)

## 📋 Required Variables

### Supabase Configuration
```env
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**How to get these values:**
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the "Project URL" and "anon/public" key

## 🎛️ Optional Variables

### Feature Flags
```env
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_ERROR_REPORTING=true
REACT_APP_ENABLE_DEBUG_MODE=true
```

### Sentry Error Reporting
```env
REACT_APP_SENTRY_DSN=https://your-key@sentry.io/project-id
```

### File Upload Settings
```env
REACT_APP_MAX_FILE_SIZE=5242880
REACT_APP_ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf
```

## 🌍 Environment-Specific Configuration

### Development (.env.local)
```env
REACT_APP_ENV=development
REACT_APP_BASE_URL=http://localhost:3000
REACT_APP_ENABLE_DEBUG_MODE=true
REACT_APP_LOG_LEVEL=debug
```

### Production (Vercel Environment Variables)
```env
REACT_APP_ENV=production
REACT_APP_BASE_URL=https://your-app.vercel.app
REACT_APP_ENABLE_DEBUG_MODE=false
REACT_APP_LOG_LEVEL=error
```

### Staging (.env.staging)
```env
REACT_APP_ENV=staging
REACT_APP_BASE_URL=https://staging-your-app.vercel.app
REACT_APP_ENABLE_DEBUG_MODE=true
REACT_APP_LOG_LEVEL=info
```

## 🔒 Security Best Practices

### ✅ Safe for Client-Side (REACT_APP_ prefix)
- Supabase anonymous key (public by design)
- API URLs
- Feature flags
- Public configuration

### ❌ Never Expose These
- Database passwords
- Service role keys
- JWT secrets
- Private API keys
- Admin credentials

### 🛡️ Protection Checklist
- [ ] `.env.local` is in `.gitignore`
- [ ] No secrets in `.env.example`
- [ ] Production secrets are in Vercel environment variables
- [ ] Database row-level security is enabled
- [ ] API endpoints validate permissions

## 🚀 Deployment Setup

### Vercel Environment Variables
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable:

```
REACT_APP_SUPABASE_URL → your-production-url
REACT_APP_SUPABASE_ANON_KEY → your-production-key
REACT_APP_ENV → production
REACT_APP_SENTRY_DSN → your-sentry-dsn
```

### Environment-Specific Deployment
- **Production:** Use production Supabase project
- **Preview:** Use staging Supabase project
- **Development:** Use local `.env.local`

## 🔍 Troubleshooting

### Common Issues

**Variables not loading:**
```bash
# Check if variables are properly prefixed
echo $REACT_APP_SUPABASE_URL

# Restart development server
npm start
```

**Build fails:**
```bash
# Check for missing required variables
npm run build
```

**Supabase connection fails:**
```bash
# Verify your URL and key format
# URL should start with https://
# Key should be a long JWT string
```

### Debug Environment Variables
Add this to your component to debug:
```javascript
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  REACT_APP_ENV: process.env.REACT_APP_ENV,
  SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL ? 'Set' : 'Missing'
});
```

## 📚 Related Documentation

- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/local-development)
- [Create React App Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## 💡 Tips

1. **Use different Supabase projects** for development/staging/production
2. **Set up database backups** before deploying to production
3. **Use Supabase CLI** for local development with local database
4. **Monitor your Supabase usage** to avoid hitting limits
5. **Enable RLS (Row Level Security)** on all tables