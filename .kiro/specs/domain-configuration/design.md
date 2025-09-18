# Domain Configuration Design Document

## Overview

This design addresses the DNS configuration issues for the vaccine hospital service domains. The system needs to properly configure custom domains with the hosting provider (appears to be Render based on the subdomain) and ensure proper DNS records are set up with the domain registrar.

## Architecture

### Domain Routing Flow
```
User Request → DNS Resolution → Hosting Provider → Application
     ↓              ↓              ↓              ↓
Domain Name → DNS Records → Render Service → React App
```

### DNS Configuration Types
1. **ANAME/ALIAS Records** (Preferred): Points directly to line-intent-router-bot.onrender.com
2. **A Records** (Fallback): Points to IP address 216.24.57.1
3. **CNAME Records**: For www subdomain pointing to main domain or service

## Components and Interfaces

### 1. DNS Configuration Component
- **Purpose**: Manage DNS record configuration and verification
- **Interface**: 
  - Domain validation methods
  - DNS record type detection
  - Verification status tracking

### 2. Domain Management Interface
- **Purpose**: Provide admin interface for domain configuration
- **Features**:
  - Add/remove custom domains
  - Display DNS configuration instructions
  - Show verification status
  - Provide troubleshooting guidance

### 3. Domain Verification Service
- **Purpose**: Verify domain ownership and DNS configuration
- **Methods**:
  - Check DNS propagation
  - Validate SSL certificate status
  - Monitor domain accessibility

## Data Models

### Domain Configuration
```typescript
interface DomainConfig {
  id: string;
  domain: string;
  subdomain?: string;
  status: 'pending' | 'verified' | 'failed' | 'enabled';
  dnsRecordType: 'ANAME' | 'CNAME' | 'A';
  targetValue: string;
  sslEnabled: boolean;
  createdAt: Date;
  lastVerified?: Date;
  errorMessage?: string;
}
```

### DNS Record Types
```typescript
interface DNSRecord {
  type: 'ANAME' | 'CNAME' | 'A';
  name: string;
  value: string;
  ttl?: number;
}
```

## Error Handling

### DNS Configuration Errors
1. **Invalid Domain Format**: Validate domain syntax before configuration
2. **DNS Propagation Delays**: Implement retry logic with exponential backoff
3. **SSL Certificate Issues**: Provide clear guidance for certificate provisioning
4. **Provider-Specific Limitations**: Handle different DNS provider capabilities

### User-Facing Error Messages
- Clear instructions for DNS record configuration
- Provider-specific guidance (Cloudflare, GoDaddy, etc.)
- Troubleshooting steps for common issues
- Contact information for additional support

## Testing Strategy

### DNS Configuration Testing
1. **Unit Tests**:
   - Domain validation functions
   - DNS record parsing
   - Status update logic

2. **Integration Tests**:
   - DNS resolution verification
   - SSL certificate validation
   - End-to-end domain access

3. **Manual Testing Scenarios**:
   - Test with different DNS providers
   - Verify both ANAME and A record configurations
   - Test subdomain routing (www vs non-www)
   - Validate SSL certificate provisioning

### Monitoring and Alerts
- Automated domain accessibility checks
- SSL certificate expiration monitoring
- DNS configuration drift detection
- Performance monitoring for custom domains

## Implementation Considerations

### Current Issues (Based on Screenshot)
1. **vaccinehomehospital.co.th**: Needs ANAME or A record configuration
2. **www.vaccinehomehospital.co.th**: Needs CNAME record pointing to service
3. **DNS Provider Compatibility**: Must handle providers that don't support ANAME records

### Configuration Steps
1. **Domain Verification**: Implement domain ownership verification
2. **DNS Record Setup**: Provide clear instructions for different record types
3. **SSL Configuration**: Ensure automatic SSL certificate provisioning
4. **Subdomain Handling**: Configure both www and non-www variants
5. **Fallback Routing**: Maintain render subdomain as backup access method

### Security Considerations
- Validate domain ownership before configuration
- Implement rate limiting for domain verification attempts
- Secure storage of domain configuration data
- Monitor for unauthorized domain changes