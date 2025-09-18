# VCHome Hospital Domain Setup Guide

## Domain Configuration
- **Domain**: vchomehospital.co.th
- **Subdomain**: www
- **Full Domain**: www.vchomehospital.co.th
- **Target**: your-render-service.onrender.com

## DNS Records Required

### Option 1: CNAME Record (Recommended)
```dns
Type: CNAME
Name: www
Value: your-render-service.onrender.com
TTL: 300 seconds
```

### Option 2: A Record
```dns
Type: A
Name: www
Value: 216.24.57.1
TTL: 300 seconds
```

## Setup Steps

### 1. Render Dashboard
1. Go to your Render service
2. Click Settings tab
3. Find Custom Domains section
4. Click "Add Custom Domain"
5. Enter: www.vchomehospital.co.th
6. Click Save

### 2. DNS Provider Setup
1. Login to your DNS management panel for vchomehospital.co.th
2. Add the CNAME record as shown above
3. Save changes
4. Wait for DNS propagation (15 minutes - 48 hours)

### 3. Verification
- Check DNS: `nslookup www.vchomehospital.co.th`
- Check SSL: Visit https://www.vchomehospital.co.th
- Use DNS checker: https://dnschecker.org

## Using Our Domain Management System

### Add Domain via UI
1. Open Staff Portal
2. Go to Domain Management
3. Click "Add Domain"
4. Fill in:
   - Domain: vchomehospital.co.th
   - Subdomain: www
   - DNS Record Type: CNAME
5. System will generate DNS instructions
6. System will monitor domain status

### Monitoring Features
- DNS resolution status
- SSL certificate validity
- Domain accessibility
- Response time monitoring
- Error detection and alerts

## Troubleshooting

### Common Issues
1. **DNS not resolving**: Wait for propagation, check TTL settings
2. **SSL certificate pending**: Ensure DNS is working first
3. **502/503 errors**: Check Render service status
4. **Mixed content warnings**: Update internal links to HTTPS

### Verification Commands
```bash
# Check DNS resolution
nslookup www.vchomehospital.co.th

# Check SSL certificate
curl -I https://www.vchomehospital.co.th

# Check response
curl -v https://www.vchomehospital.co.th
```

## Expected Timeline
- DNS setup: 5 minutes
- DNS propagation: 15 minutes - 48 hours
- SSL certificate: 5-15 minutes after DNS works
- Full functionality: Within 1 hour (if DNS propagates quickly)

## Support
- Use the Domain Management system for real-time monitoring
- Check troubleshooting guide in the system
- Monitor domain health through the dashboard