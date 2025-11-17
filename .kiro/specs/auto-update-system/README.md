# Auto-Update System Documentation

## Overview

Complete documentation for the VCHome Hospital desktop application auto-update system. This system uses electron-updater with GitHub Releases to provide seamless, automatic updates to users.

## Documentation Index

### 📚 Core Documentation

#### [Requirements](requirements.md)
Detailed requirements specification including:
- User stories and acceptance criteria
- System behavior specifications
- Update flow requirements
- Security and logging requirements

#### [Design](design.md)
Technical design document covering:
- System architecture
- Component interfaces
- Data models
- IPC communication
- Security considerations
- Implementation phases

#### [Tasks](tasks.md)
Implementation task list with:
- Setup and configuration tasks
- Component development tasks
- Integration tasks
- Testing tasks
- Documentation tasks

---

### 👥 User Documentation

#### [USER-GUIDE.md](USER-GUIDE.md)
Complete guide for end users including:
- How auto-updates work
- Update notification and installation process
- Manual update checks
- Update history viewing
- Offline behavior
- Troubleshooting common issues
- Security and privacy information
- FAQs and best practices

**Target Audience**: Hospital staff and end users

---

### 👨‍💻 Developer Documentation

#### [DEVELOPER-GUIDE.md](DEVELOPER-GUIDE.md)
Comprehensive guide for developers covering:
- Prerequisites and setup
- Complete release process (step-by-step)
- Configuration files
- Auto-updater code examples
- Best practices for versioning and releases
- Security considerations
- Automation options

**Target Audience**: Developers publishing updates

#### [QUICK-START-PUBLISHING.md](QUICK-START-PUBLISHING.md)
Quick reference for publishing releases:
- Essential commands
- Minimal steps to publish
- Quick troubleshooting

**Target Audience**: Developers who need a quick reminder

#### [GITHUB-RELEASES-GUIDE.md](GITHUB-RELEASES-GUIDE.md)
Detailed guide for GitHub Releases:
- Setting up GitHub token
- Configuring electron-builder
- Publishing to GitHub Releases
- Managing releases

**Target Audience**: Developers setting up publishing for the first time

---

### 🧪 Testing Documentation

#### [TESTING-GUIDE.md](TESTING-GUIDE.md)
Complete testing procedures:
- Unit testing
- Integration testing
- Manual testing scenarios
- Test automation

**Target Audience**: QA engineers and developers

#### [MANUAL-TESTING-GUIDE.md](MANUAL-TESTING-GUIDE.md)
Step-by-step manual testing procedures:
- Test scenarios
- Expected results
- How to verify each feature

**Target Audience**: Manual testers

#### [TESTING-CHECKLIST.md](TESTING-CHECKLIST.md)
Quick checklist for testing:
- Pre-release testing checklist
- Post-release verification
- Regression testing

**Target Audience**: QA team

---

### 🔧 Troubleshooting

#### [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
Comprehensive troubleshooting guide:
- User issues and solutions
- Developer issues and solutions
- Diagnostic tools
- Log file locations and interpretation
- Common error messages
- Getting help

**Target Audience**: Users, developers, and support staff

---

### 📋 Reference Documents

#### [RELEASE-WORKFLOW.md](RELEASE-WORKFLOW.md)
Visual workflow and process documentation:
- Release process flowchart
- Decision trees
- Workflow diagrams

#### [RELEASE-CHECKLIST-TEMPLATE.md](RELEASE-CHECKLIST-TEMPLATE.md)
Template checklist for each release:
- Pre-release tasks
- Build and publish tasks
- Post-release verification
- Communication tasks

#### [SETUP-GITHUB-TOKEN.md](SETUP-GITHUB-TOKEN.md)
Guide for setting up GitHub Personal Access Token:
- Creating token
- Setting permissions
- Configuring environment variables

---

## Quick Navigation

### I want to...

**...understand how updates work for users**
→ Read [USER-GUIDE.md](USER-GUIDE.md)

**...publish my first update**
→ Follow [DEVELOPER-GUIDE.md](DEVELOPER-GUIDE.md) step-by-step

**...quickly publish an update (I've done it before)**
→ Use [QUICK-START-PUBLISHING.md](QUICK-START-PUBLISHING.md)

**...fix an update issue**
→ Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

**...test the update system**
→ Follow [TESTING-GUIDE.md](TESTING-GUIDE.md)

**...understand the technical design**
→ Read [design.md](design.md)

**...see what was implemented**
→ Check [tasks.md](tasks.md)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │ Auto Updater     │  │ Update Manager   │  │ Logger    │ │
│  │ (electron-updater│  │ (State & Logic)  │  │ Service   │ │
│  └──────────────────┘  └──────────────────┘  └───────────┘ │
│           │                     │                    │       │
│           └─────────────────────┴────────────────────┘       │
│                              │                               │
│                    IPC Communication                         │
│                              │                               │
├──────────────────────────────┼───────────────────────────────┤
│                    Renderer Process                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │ Update Dialog    │  │ Progress Dialog  │  │ Settings  │ │
│  │ Component        │  │ Component        │  │ Page      │ │
│  └──────────────────┘  └──────────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ GitHub Releases  │
                    │ (Update Server)  │
                    └──────────────────┘
```

---

## Key Features

✅ **Automatic Update Checks** - On app startup, background checks  
✅ **Progress Tracking** - Real-time download progress with speed and ETA  
✅ **User Control** - Install now or postpone until later  
✅ **Error Handling** - Comprehensive error handling with retry logic  
✅ **Logging** - Detailed logs for troubleshooting  
✅ **Security** - Code signing and signature verification  
✅ **Update History** - Track all update activities  
✅ **Manual Checks** - Check for updates anytime from Settings  

---

## Technology Stack

- **electron-updater**: Core update functionality
- **GitHub Releases**: Update distribution
- **electron-builder**: Build and packaging
- **React**: UI components
- **IPC**: Main-Renderer communication
- **electron-log**: Logging system

---

## File Structure

```
.kiro/specs/auto-update-system/
├── README.md                          # This file - documentation index
├── requirements.md                    # Requirements specification
├── design.md                          # Technical design document
├── tasks.md                           # Implementation task list
│
├── USER-GUIDE.md                      # End user guide
├── DEVELOPER-GUIDE.md                 # Developer release guide
├── TROUBLESHOOTING.md                 # Troubleshooting guide
│
├── QUICK-START-PUBLISHING.md          # Quick publish reference
├── GITHUB-RELEASES-GUIDE.md           # GitHub Releases setup
├── SETUP-GITHUB-TOKEN.md              # Token setup guide
│
├── TESTING-GUIDE.md                   # Testing procedures
├── MANUAL-TESTING-GUIDE.md            # Manual test scenarios
├── TESTING-CHECKLIST.md               # Testing checklist
│
├── RELEASE-WORKFLOW.md                # Release process workflow
├── RELEASE-CHECKLIST-TEMPLATE.md      # Release checklist template
│
└── [Other reference documents]
```

---

## Getting Started

### For Users
1. Read [USER-GUIDE.md](USER-GUIDE.md) to understand how updates work
2. Updates happen automatically - no action needed
3. If you have issues, check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### For Developers
1. Read [DEVELOPER-GUIDE.md](DEVELOPER-GUIDE.md) for complete setup
2. Follow [SETUP-GITHUB-TOKEN.md](SETUP-GITHUB-TOKEN.md) to configure publishing
3. Use [QUICK-START-PUBLISHING.md](QUICK-START-PUBLISHING.md) for quick reference
4. Test using [TESTING-GUIDE.md](TESTING-GUIDE.md) before publishing

### For QA/Testers
1. Follow [MANUAL-TESTING-GUIDE.md](MANUAL-TESTING-GUIDE.md) for test scenarios
2. Use [TESTING-CHECKLIST.md](TESTING-CHECKLIST.md) for each release
3. Report issues using [TROUBLESHOOTING.md](TROUBLESHOOTING.md) as reference

---

## Support

### For Users
- Check [USER-GUIDE.md](USER-GUIDE.md) FAQ section
- Try [TROUBLESHOOTING.md](TROUBLESHOOTING.md) solutions
- Contact hospital IT support

### For Developers
- Review [DEVELOPER-GUIDE.md](DEVELOPER-GUIDE.md)
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) developer section
- Review electron-updater documentation
- Contact development team

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-17 | Initial documentation release |

---

## Contributing

When updating documentation:
1. Keep user and developer docs separate
2. Use clear, simple language
3. Include examples and code snippets
4. Update this README index when adding new docs
5. Test all commands and procedures
6. Keep troubleshooting guide updated with new issues

---

## License

Copyright © 2024 VCHome Hospital. All rights reserved.

---

**Last Updated**: November 2025  
**Maintained By**: VCHome Hospital Development Team
