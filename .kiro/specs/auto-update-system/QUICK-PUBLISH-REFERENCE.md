# Quick Publish Reference Card 🚀

## Status: ✅ READY TO PUBLISH

---

## Verify Setup (Run First)

```bash
npm run verify-publish
```

Expected: `✅ All checks passed!`

---

## Publish Your First Release

### Method 1: Draft (Safest)

```bash
# 1. Update version
# Edit package.json: "version": "1.0.7"

# 2. Create draft
npm run publish-draft

# 3. Check GitHub
# https://github.com/MORADOK/VaccineHomeBot/releases

# 4. Add notes and publish
```

### Method 2: Automated

```bash
# 1. Update version in package.json

# 2. Commit and tag
git add package.json
git commit -m "chore: bump version to 1.0.7"
git push origin main
git tag v1.0.7
git push origin v1.0.7

# GitHub Actions does the rest!
```

---

## Essential Commands

```bash
npm run verify-publish    # Check setup
npm run dist-win          # Build locally
npm run publish-draft     # Safe publish
npm run publish-win       # Direct publish
```

---

## Important Links

- **Releases**: https://github.com/MORADOK/VaccineHomeBot/releases
- **Actions**: https://github.com/MORADOK/VaccineHomeBot/actions
- **Token**: https://github.com/settings/tokens

---

## Files Published

When you publish, these files go to GitHub:
- `VCHome-Hospital-Setup-1.0.X.exe` (installer)
- `VCHome-Hospital-Setup-1.0.X.exe.blockmap` (updates)
- `latest.yml` (update manifest)

---

## Quick Troubleshooting

**Token not found?**
```bash
set GH_TOKEN=your_token_here
```

**Build fails?**
```bash
npm ci
npm run build
```

**Upload fails?**
```bash
npm run publish-draft
```

---

## Full Documentation

- **Setup Token**: [SETUP-GITHUB-TOKEN.md](./SETUP-GITHUB-TOKEN.md)
- **Publishing**: [GITHUB-RELEASES-GUIDE.md](./GITHUB-RELEASES-GUIDE.md)
- **Workflow**: [RELEASE-WORKFLOW.md](./RELEASE-WORKFLOW.md)
- **Testing**: [TESTING-GUIDE.md](./TESTING-GUIDE.md)

---

## What Happens Next

1. You publish → Files upload to GitHub
2. Users open app → Auto-update checks
3. Update found → Download dialog shows
4. User downloads → Progress bar displays
5. Download done → Install prompt appears
6. User installs → App updates automatically

---

**Ready? Run `npm run verify-publish` then `npm run publish-draft`!**
