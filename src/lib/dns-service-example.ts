/**
 * DNS Configuration Service Usage Examples
 * 
 * This file demonstrates how to use the DNS Configuration Service
 * for setting up custom domains with Render hosting.
 */

import { dnsService } from './dns-service';

// Example 1: Basic domain validation
export function validateCustomDomain(domain: string): boolean {
  return dnsService.validateDomain(domain);
}

// Example 2: Get DNS setup instructions for a domain
export function getDNSSetupInstructions(domain: string) {
  // First validate the domain
  if (!dnsService.validateDomain(domain)) {
    throw new Error(`Invalid domain format: ${domain}`);
  }

  const isWwwSubdomain = domain.startsWith('www.');
  
  // For www subdomains, use CNAME
  if (isWwwSubdomain) {
    return dnsService.getDNSInstructions(domain, 'CNAME');
  }

  // For root domains, prefer ANAME but provide A record as fallback
  const anameInstructions = dnsService.getDNSInstructions(domain, 'ANAME');
  const aRecordInstructions = dnsService.getDNSInstructions(domain, 'A');

  return {
    preferred: anameInstructions,
    fallback: aRecordInstructions,
    recommendation: 'Use ANAME record if your DNS provider supports it, otherwise use A record',
  };
}

// Example 3: Complete domain setup workflow
export async function setupDomainConfiguration(domain: string) {
  console.log(`Setting up DNS configuration for: ${domain}`);

  // Step 1: Validate domain
  if (!dnsService.validateDomain(domain)) {
    throw new Error(`Invalid domain format: ${domain}`);
  }
  console.log('✓ Domain format is valid');

  // Step 2: Get DNS instructions
  const instructions = getDNSSetupInstructions(domain);
  console.log('✓ DNS instructions generated');

  // Step 3: Check if we need to set up www subdomain as well
  const needsWwwSetup = !domain.startsWith('www.');
  let wwwInstructions = null;
  
  if (needsWwwSetup) {
    const wwwDomain = `www.${domain}`;
    wwwInstructions = dnsService.getDNSInstructions(wwwDomain, 'CNAME');
    console.log('✓ WWW subdomain instructions generated');
  }

  return {
    domain,
    mainDomainInstructions: instructions,
    wwwInstructions,
    summary: {
      mainDomain: domain,
      wwwDomain: needsWwwSetup ? `www.${domain}` : null,
      renderTarget: 'line-intent-router-bot.onrender.com',
      fallbackIP: '216.24.57.1',
    },
  };
}

// Example 4: Validate Render DNS configuration (mock implementation)
export async function validateRenderConfiguration(domain: string) {
  try {
    // In a real implementation, this would make actual DNS queries
    const result = await dnsService.validateRenderDNSConfiguration(domain);
    
    return {
      domain,
      isConfigured: result.isValid,
      recordType: result.recordType,
      currentValue: result.currentValue,
      recommendations: result.recommendations,
      nextSteps: result.isValid 
        ? ['Domain is properly configured!', 'Monitor SSL certificate status']
        : ['Follow DNS configuration instructions', 'Wait for DNS propagation (up to 48 hours)', 'Verify configuration again'],
    };
  } catch (error) {
    return {
      domain,
      isConfigured: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      nextSteps: ['Check domain format', 'Verify DNS provider settings', 'Contact support if issues persist'],
    };
  }
}

// Example 5: Get provider-specific instructions
export function getProviderSpecificInstructions(domain: string, provider: string) {
  const baseInstructions = getDNSSetupInstructions(domain);
  
  const providerNotes: Record<string, string[]> = {
    cloudflare: [
      'In Cloudflare, ANAME records are called "CNAME flattening"',
      'Make sure "Proxy status" is set to "DNS only" (gray cloud)',
      'SSL/TLS encryption mode should be "Full" or "Full (strict)"',
    ],
    godaddy: [
      'GoDaddy does not support ANAME records, use A record instead',
      'Use @ for the host name to point the root domain',
      'Changes may take up to 24 hours to propagate',
    ],
    namecheap: [
      'Use ALIAS record instead of ANAME in Namecheap',
      'Set Host to @ for root domain or www for subdomain',
      'TTL can be set to Automatic or 300 seconds',
    ],
    route53: [
      'Use ALIAS record type in Route 53',
      'Set "Alias" to "Yes" when creating the record',
      'Choose "Alias Target" and enter the Render domain',
    ],
  };

  return {
    ...baseInstructions,
    providerSpecific: providerNotes[provider.toLowerCase()] || [
      'Follow the general DNS instructions provided',
      'Consult your DNS provider\'s documentation for specific steps',
    ],
  };
}

// Example usage:
/*
// Validate a domain
const isValid = validateCustomDomain('vaccinehomehospital.co.th');
console.log('Domain is valid:', isValid);

// Get setup instructions
const setup = await setupDomainConfiguration('vaccinehomehospital.co.th');
console.log('Setup instructions:', setup);

// Check configuration status
const status = await validateRenderConfiguration('vaccinehomehospital.co.th');
console.log('Configuration status:', status);

// Get provider-specific help
const cloudflareHelp = getProviderSpecificInstructions('vaccinehomehospital.co.th', 'cloudflare');
console.log('Cloudflare instructions:', cloudflareHelp);
*/