/**
 * Domain Configuration Presets
 * Pre-configured domain settings for common use cases
 */

import { DomainFormData, DNSRecordType } from '@/types/domain-config';

export interface DomainPreset {
  id: string;
  name: string;
  description: string;
  domain: string;
  subdomain?: string;
  dns_record_type: DNSRecordType;
  instructions: string[];
  notes?: string;
}

export const DOMAIN_PRESETS: DomainPreset[] = [
  {
    id: 'vchomehospital-www',
    name: 'VCHome Hospital - WWW',
    description: 'Main website for VCHome Hospital',
    domain: 'vchomehospital.co.th',
    subdomain: 'www',
    dns_record_type: 'CNAME',
    instructions: [
      'Go to your DNS management panel for vchomehospital.co.th',
      'Add a CNAME record:',
      '  - Type: CNAME',
      '  - Name: www',
      '  - Value: your-render-service.onrender.com',
      '  - TTL: 300',
      'Save the changes and wait for DNS propagation',
      'SSL certificate will be automatically generated'
    ],
    notes: 'Recommended for main website. CNAME provides better flexibility.'
  },
  {
    id: 'vchomehospital-root',
    name: 'VCHome Hospital - Root Domain',
    description: 'Root domain for VCHome Hospital',
    domain: 'vchomehospital.co.th',
    dns_record_type: 'A',
    instructions: [
      'Go to your DNS management panel for vchomehospital.co.th',
      'Add an A record:',
      '  - Type: A',
      '  - Name: @ (or leave blank)',
      '  - Value: 216.24.57.1',
      '  - TTL: 300',
      'Save the changes and wait for DNS propagation',
      'SSL certificate will be automatically generated'
    ],
    notes: 'Use this for root domain access (without www)'
  },
  {
    id: 'vchomehospital-api',
    name: 'VCHome Hospital - API',
    description: 'API subdomain for VCHome Hospital',
    domain: 'vchomehospital.co.th',
    subdomain: 'api',
    dns_record_type: 'CNAME',
    instructions: [
      'Go to your DNS management panel for vchomehospital.co.th',
      'Add a CNAME record:',
      '  - Type: CNAME',
      '  - Name: api',
      '  - Value: your-api-service.onrender.com',
      '  - TTL: 300',
      'Save the changes and wait for DNS propagation'
    ],
    notes: 'For API endpoints. Point to your API service on Render.'
  }
];

export const RENDER_CONFIG = {
  defaultTarget: 'your-service-name.onrender.com',
  ipAddress: '216.24.57.1',
  sslProvider: 'Let\'s Encrypt',
  propagationTime: '15 minutes - 48 hours',
  verificationMethods: [
    'DNS resolution check',
    'HTTP response validation',
    'SSL certificate verification'
  ]
};

export function getDomainPreset(id: string): DomainPreset | undefined {
  return DOMAIN_PRESETS.find(preset => preset.id === id);
}

export function getPresetByDomain(domain: string, subdomain?: string): DomainPreset | undefined {
  return DOMAIN_PRESETS.find(preset => 
    preset.domain === domain && preset.subdomain === subdomain
  );
}

export function createDomainFormData(preset: DomainPreset): DomainFormData {
  return {
    domain: preset.domain,
    subdomain: preset.subdomain,
    dns_record_type: preset.dns_record_type
  };
}

export const COMMON_DNS_PROVIDERS = [
  {
    name: 'Cloudflare',
    instructions: [
      '1. Login to Cloudflare Dashboard',
      '2. Select your domain',
      '3. Go to DNS > Records',
      '4. Click "Add record"',
      '5. Set Proxy status to "DNS only" (gray cloud)',
      '6. Save the record'
    ]
  },
  {
    name: 'Namecheap',
    instructions: [
      '1. Login to Namecheap account',
      '2. Go to Domain List > Manage',
      '3. Click "Advanced DNS"',
      '4. Add new record',
      '5. Save changes'
    ]
  },
  {
    name: 'GoDaddy',
    instructions: [
      '1. Login to GoDaddy account',
      '2. Go to My Products > DNS',
      '3. Add new record',
      '4. Save changes'
    ]
  },
  {
    name: 'Thai Domain Registrar',
    instructions: [
      '1. Login to your domain control panel',
      '2. Find DNS Management section',
      '3. Add new DNS record',
      '4. Save and wait for propagation'
    ]
  }
];