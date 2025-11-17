# Quick Start: Publishing Your First Release

## 5-Minute Setup

Follow these steps to publish your first release to GitHub.

---

## Step 1: Get GitHub Token (2 minutes)

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Name: `VCHome Hospital Release`
4. Expiration: `90 days`
5. Check: ✅ **`repo`** (Full control)
6. Click **"Generate token"**
7. **Copy the token** (starts with `ghp_`)

---

## Step 2: Set Token (30 seconds)

**Windows Command Prompt:**
```cmd
set GH_TOKEN=ghp_your_token_here
```

**Windows PowerShell:**
```powershell
$env:GH_TOKEN="ghp_your_token_here"
```

---

## Step 3: Verify Setup (30 seconds)

```bash
npm run verify-publish
```

**Expected:**
```
✅ All checks passed! You are ready to publish releases.
```

---

## Step 4: Update Version (30 seconds)

Edit `package.json`:
```json
{
  "version": "1.0.7"
}
```

---

## Step 5: Publish (2 minutes)

**Option A: Draft Release (Safer)**
```bash
npm run publish-draft
```

**Option B: Immediate Release**
```bash
npm run publish-win
```

---

## Step 6: Verify (1 minute)

1. Go to: https://github.com/MORADOK/VaccineHomeBot/releases
2. Check your release appears
3. Verify files are uploaded:
   - ✅ `VCHome-Hospital-Setup-1.0.7.exe`
   - ✅ `VCHome-Hospital-Setup-1.0.7.exe.blockmap`
   - ✅ `latest.yml`

---

## Step 7: Add Release Notes (1 minute)

1. Click **"Edit"** on the release
2. Add description:
   ```markdown
   ## What's New
   - Feature 1
   - Feature 2
   
   ## Bug Fixes
   - Fix 1
   - Fix 2
   ```
3. Click **"Update release"** (or **"Publish release"** if draft)

---

## Done! 🎉

Your first release is published! Users can now:
- Download the installer from GitHub
- Receive automatic updates

---

## Next Steps

### Test Auto-Update

1. Install previous version (1.0.6)
2. Launch app
3. Update notification should appear
4. Test download and installation

### Automate Releases

Set up GitHub Actions for automatic releases:

```bash
# Create and push a tag
git tag v1.0.7
git push origin v1.0.7
```

The workflow will automatically build and publish!

---

## Common Issues

### "GH_TOKEN not set"

**Solution:**
```cmd
set GH_TOKEN=ghp_your_token_here
```

### "Token is invalid"

**Solution:**
1. Check token hasn't expired
2. Verify it has `repo` scope
3. Generate a new token

### "Build fails"

**Solution:**
```bash
npm run build
```
Check for build errors first.

### "Upload fails"

**Solution:**
1. Check internet connection
2. Verify token is valid
3. Try draft release: `npm run publish-draft`

---

## Quick Reference

### Commands

```bash
# Verify setup
npm run verify-publish

# Build locally (no publish)
npm run dist-win

# Publish as draft
npm run publish-draft

# Publish immediately
npm run publish-win
```

### Important URLs

- **Releases**: https://github.com/MORADOK/VaccineHomeBot/releases
- **Create Token**: https://github.com/settings/tokens
- **Actions**: https://github.com/MORADOK/VaccineHomeBot/actions

---

## Need More Help?

- **Detailed guide**: [GITHUB-RELEASES-GUIDE.md](./GITHUB-RELEASES-GUIDE.md)
- **Token setup**: [SETUP-GITHUB-TOKEN.md](./SETUP-GITHUB-TOKEN.md)
- **Release workflow**: [RELEASE-WORKFLOW.md](./RELEASE-WORKFLOW.md)
- **Testing**: [TESTING-GUIDE.md](./TESTING-GUIDE.md)

---

## Tips

1. ✅ Always test locally first: `npm run dist-win`
2. ✅ Use draft releases for first time
3. ✅ Add meaningful release notes
4. ✅ Test auto-update before announcing
5. ✅ Keep token secure (never commit to Git)

---

**Ready to publish? Let's go!** 🚀
