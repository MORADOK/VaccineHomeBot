# GitHub Personal Access Token Setup Guide

## Quick Start

This guide will help you create and configure a GitHub Personal Access Token (PAT) for publishing releases.

---

## Step-by-Step Instructions

### Step 1: Navigate to GitHub Token Settings

1. Log in to GitHub
2. Click your profile picture (top right)
3. Go to **Settings**
4. Scroll down to **Developer settings** (bottom left)
5. Click **Personal access tokens** → **Tokens (classic)**

**Direct link**: https://github.com/settings/tokens

### Step 2: Generate New Token

1. Click **"Generate new token"** button
2. Select **"Generate new token (classic)"**
3. You may need to confirm your password

### Step 3: Configure Token

#### Token Name
```
VCHome Hospital Release Publishing
```

#### Expiration
Choose one:
- **90 days** (Recommended for security)
- **No expiration** (Convenient for CI/CD, but less secure)

#### Select Scopes

**Required scope:**
- ✅ **`repo`** - Full control of private repositories

This automatically includes:
- `repo:status` - Access commit status
- `repo_deployment` - Access deployment status
- `public_repo` - Access public repositories
- `repo:invite` - Access repository invitations
- `security_events` - Read and write security events

**Why we need `repo` scope:**
- Create releases
- Upload release assets
- Read repository information
- Access release API

### Step 4: Generate and Copy Token

1. Scroll to bottom
2. Click **"Generate token"**
3. **IMPORTANT**: Copy the token immediately!
   - Format: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - You won't be able to see it again
   - If you lose it, you'll need to generate a new one

### Step 5: Store Token Securely

Choose one of the methods below:

---

## Method 1: Environment Variable (Recommended)

### Windows Command Prompt

**Temporary (current session only):**
```cmd
set GH_TOKEN=ghp_your_token_here
```

**Verify it's set:**
```cmd
echo %GH_TOKEN%
```

### Windows PowerShell

**Temporary (current session only):**
```powershell
$env:GH_TOKEN="ghp_your_token_here"
```

**Verify it's set:**
```powershell
echo $env:GH_TOKEN
```

### Permanent Environment Variable (Windows)

1. Press `Win + R`
2. Type `sysdm.cpl` and press Enter
3. Go to **Advanced** tab
4. Click **Environment Variables**
5. Under **User variables**, click **New**
6. Variable name: `GH_TOKEN`
7. Variable value: `ghp_your_token_here`
8. Click **OK** on all dialogs
9. **Restart your terminal** for changes to take effect

**Verify it's set:**
```cmd
echo %GH_TOKEN%
```

---

## Method 2: .env File (For Local Development)

### Create .env File

In your project root, create or edit `.env`:

```env
# GitHub Personal Access Token for publishing releases
GH_TOKEN=ghp_your_token_here
```

### Verify .env is in .gitignore

Check `.gitignore` includes:
```
.env
.env.local
.env.*.local
```

**⚠️ CRITICAL**: Never commit `.env` to Git!

### Load .env in Your Terminal

The token will be automatically loaded when you run npm scripts.

---

## Method 3: GitHub Actions (For Automated Releases)

### Using Built-in GITHUB_TOKEN

The workflow already uses `secrets.GITHUB_TOKEN`:

```yaml
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**No additional setup needed!** GitHub automatically provides this token.

### Using Custom Token (Optional)

If you need a custom token:

1. Go to repository: https://github.com/MORADOK/VaccineHomeBot
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `GH_TOKEN`
5. Value: Your personal access token
6. Click **Add secret**

Update workflow to use it:
```yaml
env:
  GH_TOKEN: ${{ secrets.GH_TOKEN }}
```

---

## Verify Token Setup

### Run Verification Script

```bash
npm run verify-publish
```

### Expected Output

```
🔍 Verifying GitHub Releases Publishing Setup...

🔑 Checking GitHub token...
   ✅ GH_TOKEN environment variable is set
   ✅ Token format looks correct
   🔄 Testing token validity...
   ✅ Token is valid (authenticated as: MORADOK)
```

### Manual Verification

Test token with curl:

**Windows Command Prompt:**
```cmd
curl -H "Authorization: token %GH_TOKEN%" https://api.github.com/user
```

**Windows PowerShell:**
```powershell
curl -H "Authorization: token $env:GH_TOKEN" https://api.github.com/user
```

**Expected response:**
```json
{
  "login": "MORADOK",
  "id": 12345678,
  "type": "User",
  ...
}
```

---

## Security Best Practices

### DO ✅

- ✅ Use descriptive token names
- ✅ Set expiration dates (90 days recommended)
- ✅ Store tokens in environment variables or .env files
- ✅ Add .env to .gitignore
- ✅ Rotate tokens regularly
- ✅ Revoke tokens when no longer needed
- ✅ Use minimum required scopes
- ✅ Keep tokens confidential

### DON'T ❌

- ❌ Commit tokens to Git
- ❌ Share tokens with others
- ❌ Use tokens in public repositories
- ❌ Store tokens in code
- ❌ Use tokens without expiration (unless necessary)
- ❌ Grant unnecessary scopes
- ❌ Reuse tokens across projects

---

## Troubleshooting

### Issue: "Token not found"

**Check if token is set:**
```cmd
echo %GH_TOKEN%
```

**If empty, set it:**
```cmd
set GH_TOKEN=ghp_your_token_here
```

### Issue: "Token is invalid"

**Possible causes:**
1. Token expired
2. Token was revoked
3. Token copied incorrectly (missing characters)
4. Wrong token format

**Solution:**
1. Generate a new token
2. Copy it carefully (no extra spaces)
3. Set it again

### Issue: "Permission denied"

**Possible causes:**
1. Token doesn't have `repo` scope
2. You don't have access to the repository

**Solution:**
1. Generate new token with `repo` scope
2. Verify you have write access to repository

### Issue: "Token works in terminal but not in npm scripts"

**Solution:**
Restart your terminal after setting environment variable.

### Issue: "Token works locally but not in GitHub Actions"

**Solution:**
1. Verify `secrets.GITHUB_TOKEN` is used in workflow
2. Or add custom token to repository secrets
3. Check workflow has `contents: write` permission

---

## Token Rotation

### When to Rotate

- Every 90 days (if expiration set)
- If token is compromised
- When team member leaves
- After security incident

### How to Rotate

1. Generate new token (follow steps above)
2. Update environment variable or .env file
3. Update GitHub Actions secrets (if used)
4. Revoke old token
5. Test with verification script

### Revoke Old Token

1. Go to: https://github.com/settings/tokens
2. Find the old token
3. Click **Delete**
4. Confirm deletion

---

## Multiple Tokens

### Why Use Multiple Tokens?

- Different projects
- Different permissions
- Different expiration dates
- Team members

### Naming Convention

```
VCHome Hospital - Release Publishing
VCHome Hospital - CI/CD
VCHome Hospital - Development
```

### Managing Multiple Tokens

Use different environment variables:
```cmd
set GH_TOKEN_RELEASE=ghp_xxx
set GH_TOKEN_CI=ghp_yyy
set GH_TOKEN_DEV=ghp_zzz
```

---

## Fine-Grained Tokens (Alternative)

### What are Fine-Grained Tokens?

- More secure than classic tokens
- Repository-specific permissions
- More granular control
- Recommended for new projects

### How to Create

1. Go to: https://github.com/settings/tokens?type=beta
2. Click **"Generate new token"**
3. Select **"Fine-grained token"**
4. Configure:
   - Token name: `VCHome Hospital Release`
   - Expiration: 90 days
   - Repository access: Only select repositories
   - Select: `MORADOK/VaccineHomeBot`
   - Permissions:
     - Contents: Read and write
     - Metadata: Read-only

### Format

Fine-grained tokens start with `github_pat_`:
```
github_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Quick Reference

### Token Format

- Classic: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Fine-grained: `github_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Required Scope

- Classic: `repo`
- Fine-grained: `Contents: Read and write`

### Set Token (Windows)

```cmd
set GH_TOKEN=your_token_here
```

### Verify Token

```bash
npm run verify-publish
```

### Important Links

- Create token: https://github.com/settings/tokens
- Repository: https://github.com/MORADOK/VaccineHomeBot
- Actions secrets: https://github.com/MORADOK/VaccineHomeBot/settings/secrets/actions

---

## Next Steps

After setting up your token:

1. ✅ Run verification: `npm run verify-publish`
2. ✅ Test publishing: `npm run publish-draft`
3. ✅ Read release workflow: [RELEASE-WORKFLOW.md](./RELEASE-WORKFLOW.md)
4. ✅ Set up automated releases: [GITHUB-RELEASES-GUIDE.md](./GITHUB-RELEASES-GUIDE.md)

---

## Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Run verification script: `npm run verify-publish`
3. Check GitHub token settings
4. Verify repository access
5. Contact development team

---

## Document History

- **Created**: 2025-11-17
- **Last Updated**: 2025-11-17
- **Version**: 1.0

For questions or improvements, please contact the development team.
