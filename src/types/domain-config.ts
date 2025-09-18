/**
 * TypeScript interfaces for domain configuration management
 */

export type DomainStatus = 'pending' | 'verified' | 'failed' | 'enabled';
export type DNSRecordType = 'ANAME' | 'CNAME' | 'A';

export interface DomainConfiguration {
  id: string;
  domain: string;
  subdomain?: string;
  status: DomainStatus;
  dns_record_type: DNSRecordType;
  target_value: string;
  ssl_enabled: boolean;
  verification_token?: string;
  last_verified_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  // Monitoring fields
  last_health_check?: string;
  is_accessible?: boolean;
  ssl_valid?: boolean;
  ssl_expires_at?: string;
  response_time_ms?: number;
  last_error?: string;
}

export interface DomainFormData {
  domain: string;
  subdomain?: string;
  dns_record_type: DNSRecordType;
}

export interface DNSInstructionData {
  recordType: DNSRecordType;
  name: string;
  value: string;
  instructions: string[];
}

export interface DomainVerificationResult {
  success: boolean;
  message: string;
  details?: string[];
}

// Type alias for compatibility with monitoring service
export type DomainConfig = DomainConfiguration;