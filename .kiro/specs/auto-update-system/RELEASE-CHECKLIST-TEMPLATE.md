# Release Checklist Template

Use this checklist for every release to ensure consistency and quality.

---

## Release Information

- **Version**: ___________
- **Release Date**: ___________
- **Release Type**: [ ] Patch [ ] Minor [ ] Major
- **Release Manager**: ___________

---

## Pre-Release Phase

### Code Preparation

- [ ] All features/fixes merged to main branch
- [ ] Code reviewed and approved
- [ ] All tests passing: `npm run test:run`
- [ ] Linting passes: `npm run lint`
- [ ] No known critical bugs
- [ ] Database migrations tested (if any)

### Version Update

- [ ] Updated version in `package.json`
- [ ] Version follows semantic versioning
- [ ] Committed version change to Git
- [ ] Pushed to main branch

### Documentation

- [ ] Updated CHANGELOG.md
- [ ] Prepared release notes
- [ ] Updated README (if needed)
- [ ] Documented breaking changes (if any)
- [ ] Updated user guide (if needed)

### Local Testing

- [ ] Built locally: `npm run dist-win`
- [ ] Tested installer on clean machine
- [ ] Verified all core features work
- [ ] Checked for console errors
- [ ] Tested database operations
- [ ] Verified UI/UX is correct

---

## Publishing Phase

### Setup Verification

- [ ] Ran verification script: `npm run verify-publish`
- [ ] All checks passed
- [ ] GH_TOKEN is set and valid
- [ ] Internet connection stable

### Build and Publish

**Method used**: [ ] Manual [ ] GitHub Actions

#### If Manual:

- [ ] Ran: `npm run publish-draft` or `npm run publish-win`
- [ ] Build completed successfully
- [ ] Upload completed successfully
- [ ] No errors in console

#### If GitHub Actions:

- [ ] Created and pushed tag: `git tag v_____ && git push origin v_____`
- [ ] Workflow started automatically
- [ ] Monitored workflow progress
- [ ] Workflow completed successfully
- [ ] Checked workflow logs for errors

### Release Verification

- [ ] Release appears on GitHub: https://github.com/MORADOK/VaccineHomeBot/releases
- [ ] Release is published (not draft)
- [ ] All files uploaded correctly:
  - [ ] `VCHome-Hospital-Setup-X.X.X.exe`
  - [ ] `VCHome-Hospital-Setup-X.X.X.exe.blockmap`
  - [ ] `latest.yml`
- [ ] File sizes are reasonable (~80-100 MB for installer)
- [ ] Download links work

### Release Notes

- [ ] Added release notes to GitHub release
- [ ] Included "What's New" section
- [ ] Included "Bug Fixes" section
- [ ] Included "Breaking Changes" (if any)
- [ ] Included installation instructions
- [ ] Included upgrade notes (if needed)

---

## Post-Release Phase

### Auto-Update Testing

- [ ] Installed previous version on test machine
- [ ] Launched app
- [ ] Update notification appeared
- [ ] Clicked "Download"
- [ ] Progress bar displayed correctly
- [ ] Download completed successfully
- [ ] Clicked "Install Now"
- [ ] App restarted with new version
- [ ] Verified new version number in app
- [ ] All features work in updated version

### Manual Update Testing

- [ ] Opened Settings → Check for Updates
- [ ] Clicked "Check for Updates"
- [ ] Update detected correctly
- [ ] Download and install worked
- [ ] Update history logged correctly

### Smoke Testing

- [ ] App starts successfully
- [ ] Login works
- [ ] Patient portal loads
- [ ] Staff portal loads
- [ ] Database operations work
- [ ] All menus accessible
- [ ] No console errors
- [ ] No visual glitches

### Communication

- [ ] Notified development team
- [ ] Notified QA team
- [ ] Notified stakeholders
- [ ] Updated internal documentation
- [ ] Posted announcement (if applicable)
- [ ] Sent email to users (if applicable)

### Monitoring

- [ ] Set up error monitoring
- [ ] Checked for crash reports
- [ ] Monitored download statistics
- [ ] Watched for user feedback
- [ ] Reviewed error logs

---

## Rollback Plan (If Needed)

### If Critical Issues Found:

- [ ] Assessed severity of issue
- [ ] Decided on action: [ ] Quick patch [ ] Rollback [ ] Mark as pre-release
- [ ] Communicated issue to team
- [ ] Implemented fix or rollback
- [ ] Tested fix thoroughly
- [ ] Released patch version (if applicable)

### Rollback Steps:

- [ ] Deleted problematic release from GitHub
- [ ] Reverted version in package.json
- [ ] Fixed issues
- [ ] Re-tested thoroughly
- [ ] Re-released with new version

---

## Post-Release Review

### Metrics

- **Build time**: _____ minutes
- **Upload time**: _____ minutes
- **Total release time**: _____ minutes
- **Downloads (24h)**: _____
- **Update adoption rate**: _____%
- **Issues reported**: _____

### What Went Well

1. _____________________________________
2. _____________________________________
3. _____________________________________

### What Could Be Improved

1. _____________________________________
2. _____________________________________
3. _____________________________________

### Action Items

1. _____________________________________
2. _____________________________________
3. _____________________________________

---

## Sign-Off

### Release Manager

- **Name**: ___________
- **Date**: ___________
- **Signature**: ___________

### QA Lead

- **Name**: ___________
- **Date**: ___________
- **Signature**: ___________

### Technical Lead

- **Name**: ___________
- **Date**: ___________
- **Signature**: ___________

---

## Notes

_Use this section for any additional notes, observations, or special circumstances related to this release._

---

## Attachments

- [ ] Build logs
- [ ] Test results
- [ ] Screenshots
- [ ] Error reports
- [ ] Performance metrics

---

## Template Version

- **Version**: 1.0
- **Last Updated**: 2025-11-17
- **Next Review**: _____

---

## Quick Reference

### Commands Used

```bash
# Verify setup
npm run verify-publish

# Build locally
npm run dist-win

# Publish
npm run publish-win

# Create tag
git tag v1.0.7
git push origin v1.0.7
```

### Important URLs

- **Releases**: https://github.com/MORADOK/VaccineHomeBot/releases
- **Actions**: https://github.com/MORADOK/VaccineHomeBot/actions
- **Issues**: https://github.com/MORADOK/VaccineHomeBot/issues

---

**Save this completed checklist for future reference and process improvement.**
