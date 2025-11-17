# Release Workflow Documentation

## Overview

This document describes the complete workflow for releasing new versions of VCHome Hospital Desktop Application, from preparation to post-release verification.

## Release Types

### 1. Patch Release (Bug Fixes)
- Version: 1.0.6 → 1.0.7
- Timeline: As needed
- Testing: Focused on fixed bugs

### 2. Minor Release (New Features)
- Version: 1.0.7 → 1.1.0
- Timeline: Monthly or as planned
- Testing: Full regression + new features

### 3. Major Release (Breaking Changes)
- Version: 1.1.0 → 2.0.0
- Timeline: Quarterly or as planned
- Testing: Comprehensive + migration testing

---

## Pre-Release Checklist

### 1. Code Preparation

- [ ] All features/fixes merged to main branch
- [ ] Code reviewed and approved
- [ ] No known critical bugs
- [ ] All tests passing
- [ ] Linting passes: `npm run lint`

### 2. Version Update

- [ ] Update version in `package.json`
- [ ] Update version in documentation if needed
- [ ] Create changelog entry

### 3. Testing

- [ ] Build locally: `npm run dist-win`
- [ ] Test installer on clean Windows machine
- [ ] Verify all core features work
- [ ] Test auto-update from previous version
- [ ] Check for console errors
- [ ] Verify database migrations (if any)

### 4. Documentation

- [ ] Update README if needed
- [ ] Prepare release notes
- [ ] Document breaking changes (if any)
- [ ] Update user guide (if needed)

---

## Release Process

### Method 1: Manual Release (Recommended for First Time)

#### Step 1: Prepare Environment

```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Verify setup
npm run verify-publish
```

#### Step 2: Update Version

Edit `package.json`:
```json
{
  "version": "1.0.7"
}
```

Commit the version change:
```bash
git add package.json
git commit -m "chore: bump version to 1.0.7"
git push origin main
```

#### Step 3: Build and Publish

```bash
# Option A: Publish immediately
npm run publish-win

# Option B: Create draft release (safer)
npm run publish-draft
```

#### Step 4: Finalize Release on GitHub

1. Go to: https://github.com/MORADOK/VaccineHomeBot/releases
2. Find the draft release (if using publish-draft)
3. Click "Edit"
4. Add release notes (see template below)
5. Click "Publish release"

#### Step 5: Create Git Tag

```bash
git tag v1.0.7
git push origin v1.0.7
```

### Method 2: Automated Release (GitHub Actions)

#### Step 1: Prepare and Commit

```bash
# Update version in package.json
# Commit changes
git add package.json
git commit -m "chore: bump version to 1.0.7"
git push origin main
```

#### Step 2: Create and Push Tag

```bash
git tag v1.0.7
git push origin v1.0.7
```

#### Step 3: Monitor Workflow

1. Go to: https://github.com/MORADOK/VaccineHomeBot/actions
2. Watch the "Build and Release" workflow
3. Check for any errors
4. Wait for completion (~5-10 minutes)

#### Step 4: Add Release Notes

1. Go to: https://github.com/MORADOK/VaccineHomeBot/releases
2. Find the new release
3. Click "Edit"
4. Add release notes
5. Click "Update release"

---

## Release Notes Template

```markdown
## VCHome Hospital v1.0.7

### 🎉 New Features
- Added automatic update system with progress tracking
- Implemented update history log in settings
- Added manual "Check for Updates" button

### 🐛 Bug Fixes
- Fixed vaccine dose calculation for children under 6 months
- Resolved appointment button visibility issue
- Fixed overdue appointments display

### 🔧 Improvements
- Improved loading performance
- Enhanced error handling and logging
- Updated UI for better responsiveness

### 📝 Notes
- This version includes automatic updates - future updates will install automatically
- Users can choose to install updates immediately or postpone

### 🔗 Installation
Download the installer below and run it. The application will automatically check for updates on startup.

### 📋 Full Changelog
See [CHANGELOG.md](./CHANGELOG.md) for complete details.
```

---

## Post-Release Checklist

### 1. Verification

- [ ] Release appears on GitHub: https://github.com/MORADOK/VaccineHomeBot/releases
- [ ] All files uploaded correctly:
  - [ ] `VCHome-Hospital-Setup-1.0.7.exe`
  - [ ] `VCHome-Hospital-Setup-1.0.7.exe.blockmap`
  - [ ] `latest.yml`
- [ ] Release notes are complete and accurate
- [ ] Download links work

### 2. Testing Auto-Update

- [ ] Install previous version (1.0.6)
- [ ] Launch application
- [ ] Verify update notification appears
- [ ] Test download progress
- [ ] Test "Install Now" option
- [ ] Verify app updates successfully
- [ ] Check new version number in app

### 3. Communication

- [ ] Notify team about new release
- [ ] Update internal documentation
- [ ] Inform users (if applicable)
- [ ] Post announcement (if applicable)

### 4. Monitoring

- [ ] Monitor for crash reports
- [ ] Check error logs
- [ ] Watch for user feedback
- [ ] Monitor download statistics

---

## Rollback Procedure

If critical issues are discovered after release:

### Option 1: Quick Patch

1. Fix the issue immediately
2. Release new patch version (1.0.8)
3. Follow normal release process

### Option 2: Delete Release (Emergency Only)

1. Go to GitHub Releases
2. Click "Delete" on problematic release
3. Users on old version won't see the update
4. Fix issues and re-release

### Option 3: Mark as Pre-release

1. Edit the release on GitHub
2. Check "This is a pre-release"
3. Only beta testers will see it
4. Fix issues and re-release as stable

---

## Release Schedule

### Regular Releases

- **Patch releases**: As needed (bug fixes)
- **Minor releases**: Monthly (new features)
- **Major releases**: Quarterly (breaking changes)

### Emergency Releases

- Critical security fixes: Immediate
- Critical bug fixes: Within 24 hours
- Data loss bugs: Immediate

---

## Version History Tracking

### Maintain CHANGELOG.md

```markdown
# Changelog

## [1.0.7] - 2025-11-17

### Added
- Auto-update system with progress tracking
- Update history log in settings

### Fixed
- Vaccine dose calculation bug
- Appointment button visibility

### Changed
- Improved loading performance

## [1.0.6] - 2025-11-10

### Added
- Initial stable release
```

---

## Troubleshooting Release Issues

### Build Fails

```bash
# Clear cache and rebuild
rm -rf node_modules dist-electron release
npm ci
npm run build
npm run dist-win
```

### Publish Fails

1. Check GH_TOKEN is set: `echo %GH_TOKEN%`
2. Verify token permissions
3. Check internet connection
4. Try draft release: `npm run publish-draft`

### Auto-Update Not Working

1. Verify `latest.yml` exists in release
2. Check version number is higher than current
3. Verify app is checking for updates
4. Check logs: `%APPDATA%/VCHome Hospital/logs`

### Files Not Uploading

1. Check file size (GitHub has 2GB limit)
2. Verify internet connection
3. Try manual upload to release
4. Check GitHub Actions logs

---

## Best Practices

### Before Release

1. ✅ Test on clean machine
2. ✅ Verify all features work
3. ✅ Check for console errors
4. ✅ Review code changes
5. ✅ Update documentation

### During Release

1. ✅ Use semantic versioning
2. ✅ Write clear release notes
3. ✅ Tag releases properly
4. ✅ Monitor build process
5. ✅ Verify uploads complete

### After Release

1. ✅ Test auto-update
2. ✅ Monitor for issues
3. ✅ Respond to feedback
4. ✅ Update documentation
5. ✅ Plan next release

---

## Emergency Contacts

### If Release Fails

1. Check GitHub Actions logs
2. Review error messages
3. Consult this documentation
4. Contact development team

### Critical Issues

1. Stop release immediately
2. Assess impact
3. Decide on rollback or patch
4. Communicate with stakeholders

---

## Automation Opportunities

### Future Improvements

1. Automated testing before release
2. Automated changelog generation
3. Automated version bumping
4. Automated release notes from commits
5. Automated notification to users

---

## Release Metrics

### Track These Metrics

- Time from commit to release
- Number of downloads per version
- Update adoption rate
- Crash reports per version
- User feedback per version

### Review Regularly

- Monthly release retrospective
- Quarterly process improvement
- Annual workflow optimization

---

## Quick Reference

### Release Commands

```bash
# Verify setup
npm run verify-publish

# Build locally
npm run dist-win

# Publish immediately
npm run publish-win

# Create draft
npm run publish-draft

# Tag and push
git tag v1.0.7
git push origin v1.0.7
```

### Important Files

- `package.json` - Version number
- `.github/workflows/release.yml` - Automated workflow
- `release/latest.yml` - Update manifest
- `CHANGELOG.md` - Version history

### Important URLs

- Releases: https://github.com/MORADOK/VaccineHomeBot/releases
- Actions: https://github.com/MORADOK/VaccineHomeBot/actions
- Issues: https://github.com/MORADOK/VaccineHomeBot/issues

---

## Appendix

### A. Semantic Versioning Rules

- MAJOR.MINOR.PATCH (e.g., 1.0.7)
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)

### B. Release Naming Convention

- Tag: `v1.0.7`
- Release title: `VCHome Hospital v1.0.7`
- Installer: `VCHome-Hospital-Setup-1.0.7.exe`

### C. File Checklist

Every release must include:
- ✅ Installer (.exe)
- ✅ Blockmap (.exe.blockmap)
- ✅ Update manifest (latest.yml)
- ✅ Release notes
- ✅ Git tag

---

## Document History

- **2025-11-17**: Initial version
- **Last Updated**: 2025-11-17

For questions or improvements to this workflow, please contact the development team.
