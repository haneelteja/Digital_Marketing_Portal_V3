# Digital Marketing Portal V3 - Deployment Package

## Package Information
- **Version**: V3
- **Build Date**: 2025-01-11
- **Framework**: Next.js 15.5.3, React 19.1.0
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth

## What's Included

### Source Code
- Complete Next.js application source code in `src/`
- Configuration files (`next.config.ts`, `tsconfig.json`, `tailwind.config.js`)
- API routes and server-side logic
- React components and UI

### Database Scripts
- `supabase_migration.sql` - Main database schema
- `create_admin_user.sql` - Admin user creation
- `create_campaign_uploads_table.sql` - Campaign uploads schema
- `create_artwork_uploads_table.sql` - Artwork uploads schema
- Additional SQL scripts for specific features

### Documentation
- Setup guides and migration instructions
- Feature documentation
- API documentation
- Performance analysis and improvement plans

## Pre-Deployment Checklist

### 1. Environment Variables
Create a `.env.local` file in the project root with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Email Configuration (if using custom SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
```

### 2. Database Setup
1. Run `supabase_migration.sql` in your Supabase SQL editor
2. Run `create_admin_user.sql` to create the initial admin user
3. Run `create_campaign_uploads_table.sql` for campaign uploads feature
4. Run `create_artwork_uploads_table.sql` for artwork uploads feature

### 3. Supabase Storage Buckets
Create the following storage buckets in Supabase:
- `monthly-analytics` - For monthly analytics files
- `campaign-media` - For social media campaign uploads
- `artwork-media` - For artwork uploads

### 4. Install Dependencies
```bash
npm install
```

### 5. Build the Application
```bash
npm run build
```

### 6. Start Production Server
```bash
npm start
```

## Features Included

### Core Features
- ✅ User Management (IT_ADMIN, AGENCY_ADMIN, CLIENT, DESIGNER roles)
- ✅ Client Management
- ✅ Calendar & Posts Management
- ✅ Social Media Campaigns
- ✅ Art Works Management
- ✅ Monthly Analytics Upload
- ✅ Reports & Export (Excel)
- ✅ Notifications System
- ✅ Mobile-Responsive Design

### Recent Enhancements (V3)
- ✅ Campaign Uploads with Approval Workflow
- ✅ Artwork Uploads with Approval Workflow
- ✅ Enhanced Client Name Display
- ✅ Mobile Compatibility Improvements
- ✅ Performance Optimizations
- ✅ Content Security Policy Updates
- ✅ Fixed Assigned Clients Loading for AGENCY_ADMIN and CLIENT users

## Security Notes

### Excluded from Package
- `.env.local` - Contains sensitive credentials (create your own)
- `node_modules/` - Dependencies (install with `npm install`)
- `.next/` - Build artifacts (generated with `npm run build`)
- IDE configuration files
- Log files and temporary files

### Security Best Practices
1. Never commit `.env.local` to version control
2. Use strong service role keys
3. Enable Row Level Security (RLS) in Supabase
4. Regularly update dependencies: `npm audit`
5. Use HTTPS in production
6. Configure proper CORS settings

## Deployment Platforms

### Vercel (Recommended)
1. Connect your GitHub repository
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Docker
```bash
docker build -t digital-marketing-portal .
docker run -p 3000:3000 digital-marketing-portal
```

### Self-Hosted
1. Install Node.js 18+ and npm
2. Follow the pre-deployment checklist above
3. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start npm --name "portal" -- start
   ```

## Support & Documentation

### Key Documentation Files
- `README.md` - Main project documentation
- `DEPLOYMENT.md` - Detailed deployment guide
- `SUPABASE_MIGRATION_GUIDE.md` - Database setup guide
- `MOBILE_COMPATIBILITY_COMPLETE.md` - Mobile features
- `PERFORMANCE_ANALYSIS_AND_IMPROVEMENT_PLAN.md` - Performance guide

### Troubleshooting
- Check browser console for errors
- Verify environment variables are set correctly
- Ensure Supabase RLS policies are active
- Check network connectivity to Supabase

## Version History

### V3 (Current)
- Fixed assigned clients loading for AGENCY_ADMIN and CLIENT users
- Enhanced client name display in campaigns and artworks
- Removed Designer and Priority columns from Art Works table
- Updated Content Security Policy for Google Fonts
- Mobile compatibility improvements
- Performance optimizations

### Previous Versions
- V2: Campaign and Artwork uploads feature
- V1: Initial release with core features

## License
Proprietary - All rights reserved

## Contact
For support and questions, refer to the project documentation or contact the development team.




