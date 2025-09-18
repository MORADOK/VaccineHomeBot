# Domain Removal and Cleanup Functionality

## Overview

The domain removal functionality provides safe deletion of domain configurations with comprehensive validation, confirmation dialogs, and cleanup procedures.

## Features

### 1. Safe Domain Removal
- **Confirmation Token**: Requires typing the exact domain name to confirm deletion
- **Multi-step Process**: Warning step followed by confirmation step
- **Status Validation**: Prevents deletion of active/enabled domains without explicit force flag

### 2. Force Delete Option
- **Bypass Safety Checks**: For enabled domains that need immediate removal
- **Cleanup Process**: Automatically disables domain before deletion
- **Administrative Override**: Available for system administrators

### 3. Validation and Safety Checks
- **Active Domain Protection**: Prevents deletion of enabled domains
- **Fallback Domain Protection**: Ensures at least one domain remains accessible
- **Recent Activity Warning**: Warns about recently accessible domains
- **Input Validation**: Validates domain IDs and confirmation tokens

### 4. Cleanup Process
- **Status Update**: Disables enabled domains before removal
- **Token Cleanup**: Clears verification tokens and cached data
- **Error Handling**: Continues deletion even if cleanup fails
- **Logging**: Records cleanup actions for audit trail

## Usage

### Basic Domain Removal
```typescript
// Generate confirmation token
const token = domainService.generateDeletionConfirmationToken(domain);

// Safe removal with confirmation
await domainService.safeDomainRemoval(domainId, token);
```

### Force Delete (Administrative)
```typescript
// Force delete bypassing all safety checks
await domainService.forceDeleteDomainConfiguration(domainId);

// Or use the force flag
await domainService.deleteDomainConfiguration(domainId, { force: true });
```

### UI Component Usage
```tsx
import { DomainRemovalDialog } from '@/components/DomainRemovalDialog';

<DomainRemovalDialog
  domain={selectedDomain}
  isOpen={showRemovalDialog}
  onClose={() => setShowRemovalDialog(false)}
  onSuccess={() => {
    // Refresh domain list
    queryClient.invalidateQueries(['domain-configurations']);
  }}
/>
```

## API Methods

### `deleteDomainConfiguration(id, options?)`
- **Purpose**: Main deletion method with safety checks
- **Parameters**: 
  - `id`: Domain configuration ID
  - `options.force`: Boolean to bypass safety checks
- **Validation**: Checks domain status and prevents unsafe deletions

### `safeDomainRemoval(id, confirmationToken)`
- **Purpose**: Deletion with confirmation token validation
- **Parameters**:
  - `id`: Domain configuration ID
  - `confirmationToken`: Generated confirmation token
- **Security**: Validates token matches domain

### `forceDeleteDomainConfiguration(id)`
- **Purpose**: Administrative deletion bypassing all checks
- **Parameters**: `id`: Domain configuration ID
- **Warning**: Use with caution - no safety checks

### `generateDeletionConfirmationToken(domain)`
- **Purpose**: Generate confirmation token for safe deletion
- **Parameters**: `domain`: Domain configuration object
- **Returns**: String token containing domain name and ID

## Safety Features

### 1. Status-Based Protection
- **Enabled Domains**: Cannot be deleted without force flag
- **Pending/Failed Domains**: Can be deleted normally
- **Verified Domains**: Can be deleted with confirmation

### 2. Confirmation Requirements
- **Domain Name Typing**: User must type exact domain name
- **Token Validation**: Server-side validation of confirmation token
- **Multi-step Process**: Warning → Confirmation → Deletion

### 3. Fallback Protection
- **Last Domain Check**: Prevents deletion of the only enabled domain
- **Accessibility Warning**: Warns about recently accessible domains
- **Graceful Degradation**: Maintains service availability

## Error Handling

### Common Error Scenarios
1. **Invalid Domain ID**: Validates ID format and existence
2. **Enabled Domain Protection**: Prevents unsafe deletions
3. **Invalid Confirmation**: Rejects incorrect confirmation tokens
4. **Database Errors**: Handles Supabase operation failures
5. **Cleanup Failures**: Continues deletion despite cleanup issues

### Error Messages
- `"Invalid domain configuration ID"`: ID validation failed
- `"Domain configuration not found"`: Domain doesn't exist
- `"Cannot delete enabled domain configuration"`: Status protection
- `"Invalid confirmation token"`: Token validation failed
- `"Failed to delete domain configuration"`: Database error

## Testing

### Unit Tests
- Confirmation token generation and validation
- Safety check validation
- Error handling scenarios
- Cleanup process verification

### Integration Tests
- End-to-end deletion workflow
- Multi-domain scenarios
- Error recovery testing
- UI component integration

### Manual Testing Checklist
- [ ] Delete pending domain successfully
- [ ] Prevent deletion of enabled domain
- [ ] Force delete enabled domain
- [ ] Validate confirmation token
- [ ] Handle non-existent domain
- [ ] Test cleanup process
- [ ] Verify UI dialog flow
- [ ] Check error messages

## Security Considerations

### 1. Authorization
- Ensure user has permission to delete domains
- Validate domain ownership
- Log deletion actions for audit

### 2. Confirmation Token Security
- Tokens include domain name and ID fragment
- Server-side validation prevents tampering
- Tokens are single-use and context-specific

### 3. Data Protection
- Soft delete option for recovery
- Backup verification before deletion
- Audit trail maintenance

## Troubleshooting

### Common Issues
1. **Deletion Blocked**: Check domain status and use force if needed
2. **Confirmation Failed**: Ensure exact domain name is typed
3. **Cleanup Warnings**: Review logs but deletion should continue
4. **UI Not Updating**: Check query invalidation after deletion

### Debug Information
- Check browser console for error messages
- Review server logs for deletion attempts
- Verify domain status before deletion
- Confirm user permissions

## Future Enhancements

### Planned Features
- Soft delete with recovery option
- Bulk domain deletion
- Scheduled deletion
- Advanced cleanup options
- Integration with DNS provider APIs

### Configuration Options
- Deletion confirmation timeout
- Cleanup retry attempts
- Audit log retention
- Administrative override settings