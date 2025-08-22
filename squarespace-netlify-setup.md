# Setting up Netlify Custom Domain with Squarespace

## Step 1: Get Your Netlify Site Name
1. Deploy your site to Netlify first
2. Your site will have a URL like: `amazing-softball-12345.netlify.app`
3. Copy this URL (you'll need it)

## Step 2: Add Custom Domain in Netlify
1. Go to your Netlify site dashboard
2. Domain settings → Add custom domain
3. Enter your desired domain (e.g., `roster.yourteam.com`)
4. Netlify will show you the DNS records needed

## Step 3: Configure in Squarespace
1. Log into Squarespace
2. Go to **Settings → Domains**
3. Click on your domain
4. Click **DNS Settings**

## Step 4: Add CNAME Record

### For Subdomain (e.g., roster.yourteam.com):
1. Click **Add Record**
2. Select **CNAME**
3. Fill in:
   - **Host**: `roster` (just the subdomain part)
   - **Points to**: `amazing-softball-12345.netlify.app` (your Netlify URL)
   - **TTL**: Leave default (usually 3600)
4. Click **Add**

### For Root Domain (e.g., yourteam.com):
⚠️ **Note**: Squarespace doesn't support CNAME on root domains. You'll need to:
1. Use a subdomain instead (recommended), OR
2. Transfer domain to Netlify DNS, OR
3. Use Squarespace's forwarding to redirect to Netlify

## Step 5: Wait for Propagation
- DNS changes can take 24-48 hours
- Usually works within 30 minutes
- Check status in Netlify dashboard

## Step 6: Enable HTTPS
1. Once DNS is working, go to Netlify
2. Domain settings → HTTPS
3. Click "Provision certificate"
4. Netlify handles SSL automatically (free!)

## Common Issues:

### "Domain already exists" error in Netlify:
- Someone else might have claimed it
- Contact Netlify support

### DNS not working after 48 hours:
- Double-check the CNAME record
- Ensure no conflicting A records
- Try clearing browser cache

### Squarespace won't let you add CNAME:
- Make sure subdomain doesn't already exist
- Check for conflicting records
- May need to delete existing A records

## Alternative: Domain Forwarding
If CNAME doesn't work, use Squarespace forwarding:
1. Settings → Domains → your domain
2. Click "Forward Domain"
3. Forward to: `https://amazing-softball-12345.netlify.app`
4. Enable SSL

## Best Practice for Softball Site:
Use a subdomain like:
- `roster.yourteamname.com`
- `softball.yourteamname.com`
- `team.yourteamname.com`

This keeps your main site on Squarespace while the roster app lives on Netlify.