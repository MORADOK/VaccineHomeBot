# Render Setup Instructions for www.vchomehospital.co.th

## Step 1: Add Custom Domain in Render Dashboard

### 1.1 Access Your Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Find your service (e.g., "vaccine-home-bot")
3. Click on the service name

### 1.2 Add Custom Domain
1. Click on the **Settings** tab
2. Scroll down to **Custom Domains** section
3. Click **"Add Custom Domain"**
4. Enter: `www.vchomehospital.co.th`
5. Click **"Save"**

### 1.3 Note the Target
After adding, Render will show:
- **Target**: `your-service-name.onrender.com`
- **Status**: Pending (waiting for DNS)

## Step 2: Configure DNS Records

### Option A: CNAME Record (Recommended)
```dns
Type: CNAME
Name: www
Value: your-service-name.onrender.com
TTL: 300
```

### Option B: A Record
```dns
Type: A
Name: www
Value: 216.24.57.1
TTL: 300
```

## Step 3: DNS Provider Setup

### For Cloudflare:
1. Login to Cloudflare Dashboard
2. Select `vchomehospital.co.th`
3. Go to **DNS > Records**
4. Click **"Add record"**
5. Fill in the CNAME record details
6. Set **Proxy status** to **"DNS only"** (gray cloud)
7. Click **"Save"**

### For Other Providers:
1. Login to your DNS management panel
2. Find DNS records section
3. Add new CNAME record
4. Use the values shown above
5. Save changes

## Step 4: Verification

### Check DNS Propagation:
```bash
nslookup www.vchomehospital.co.th
```

Expected result:
```
www.vchomehospital.co.th canonical name = your-service-name.onrender.com
```

### Online Tools:
- [DNS Checker](https://dnschecker.org)
- [What's My DNS](https://whatsmydns.net)

## Step 5: SSL Certificate

### Automatic SSL:
- Render automatically generates SSL certificates
- Uses Let's Encrypt (free)
- Takes 5-15 minutes after DNS propagation
- No additional configuration needed

### Verification:
```bash
curl -I https://www.vchomehospital.co.th
```

## Timeline Expectations

| Step | Time Required |
|------|---------------|
| Add domain in Render | 1 minute |
| DNS configuration | 5 minutes |
| DNS propagation | 15 minutes - 48 hours |
| SSL certificate | 5-15 minutes after DNS |
| Full functionality | Usually within 1 hour |

## Troubleshooting

### Common Issues:

1. **DNS not resolving**
   - Wait longer for propagation
   - Check TTL settings
   - Verify record values

2. **SSL certificate pending**
   - Ensure DNS is working first
   - Wait for propagation to complete
   - Check for mixed content issues

3. **502/503 errors**
   - Check Render service status
   - Verify service is running
   - Check logs in Render dashboard

### Support Resources:
- [Render Documentation](https://render.com/docs/custom-domains)
- Use the Domain Management system for monitoring
- Check troubleshooting guide in the system

## Security Notes

- SSL certificate is automatically renewed
- HTTPS redirect is enabled by default
- Domain verification prevents unauthorized use
- Monitor certificate expiration through the system