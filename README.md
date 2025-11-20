# Ararat Design - Admin Panel Deployment

This folder contains all files needed to deploy the admin panel to **admin.araratdesign.org** on Vercel.

## Structure

- `*.html` - All admin HTML pages
- `assets/` - Admin-specific assets (CSS, JS, images, fonts, etc.)
- `vercel.json` - Vercel configuration

## Deployment

See the main [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) for detailed instructions.

### Quick Deploy

1. Deploy via Vercel Dashboard or CLI
2. Set custom domain: `admin.araratdesign.org`
3. Configure DNS as per Vercel's instructions

## Important Notes

- Admin files are self-contained with their own assets folder
- All original files in `admin/` remain untouched
- This is a static site - no build process required

## Backend API Configuration

Make sure to update the API endpoint in `assets/js/auth.js` and other JavaScript files to point to your production backend URL instead of `http://localhost:8000`.
