# Design Document

## Overview

การลบลายเส้น Lovable ออกจากโปรเจกต์จะดำเนินการในหลายขั้นตอน โดยจะต้องแทนที่ dependencies, อัปเดตการตั้งค่า build, ย้ายไฟล์ภาพ และอัปเดตเอกสาร เพื่อให้โปรเจกต์เป็นอิสระจาก Lovable platform

## Architecture

### Current State Analysis
- **Dependencies**: โปรเจกต์ใช้ `lovable-tagger` ใน devDependencies
- **Build Configuration**: vite.config.ts ใช้ `componentTagger` จาก lovable-tagger
- **Images**: ใช้ภาพจาก `/lovable-uploads/1b8e7853-1bde-4b32-b01d-6dad1be1008c.png`
- **Documentation**: README.md มีการอ้างอิงถึง Lovable platform
- **Meta Tags**: index.html ใช้ภาพจาก lovable-uploads

### Target State
- **Clean Dependencies**: ลบ lovable-tagger ออกจาก package.json
- **Updated Build Config**: ลบ componentTagger ออกจาก vite.config.ts
- **Local Images**: ย้ายภาพไปยัง `/images/` และอัปเดต references
- **Independent Documentation**: อัปเดต README.md ให้เป็นอิสระ
- **Updated Meta Tags**: ใช้ path ภาพใหม่

## Components and Interfaces

### 1. Package Management
- **Input**: package.json และ package-lock.json ที่มี lovable-tagger
- **Process**: ลบ dependency และ regenerate lock file
- **Output**: Clean package files ที่ไม่มี Lovable dependencies

### 2. Build Configuration
- **Input**: vite.config.ts ที่ใช้ componentTagger
- **Process**: ลบ import และการใช้งาน componentTagger
- **Output**: Clean vite config ที่ทำงานได้ปกติ

### 3. Image Management
- **Input**: ภาพใน `/lovable-uploads/` และ references ในโค้ด
- **Process**: ย้ายภาพไปยัง `/images/` และอัปเดต paths
- **Output**: Local image references ที่ไม่พึ่งพา external sources

### 4. Code References
- **Input**: Component files ที่อ้างอิงภาพจาก lovable-uploads
- **Process**: Find และ replace image paths
- **Output**: Updated components ที่ใช้ local image paths

## Data Models

### Image Reference Mapping
```typescript
interface ImageMapping {
  oldPath: string; // "/lovable-uploads/1b8e7853-1bde-4b32-b01d-6dad1be1008c.png"
  newPath: string; // "/images/hospital-logo.png"
  description: string; // "โลโก้โรงพยาบาลโฮม"
}
```

### File Update Pattern
```typescript
interface FileUpdate {
  filePath: string;
  searchPattern: string | RegExp;
  replacement: string;
  description: string;
}
```

## Error Handling

### Build Errors
- **Issue**: Missing lovable-tagger dependency after removal
- **Solution**: Ensure vite.config.ts is updated before removing package
- **Validation**: Run `npm run build` to verify

### Image Loading Errors
- **Issue**: Broken image references after path changes
- **Solution**: Systematic find/replace with verification
- **Validation**: Check all components render correctly

### Development Server Issues
- **Issue**: Development server fails to start
- **Solution**: Ensure all imports are updated before removing dependencies
- **Validation**: Run `npm run dev` to verify

## Testing Strategy

### 1. Pre-removal Verification
- Document current functionality
- Take screenshots of UI components
- Verify build and dev server work

### 2. Incremental Testing
- Test after each major change (config, images, docs)
- Verify build process at each step
- Check UI rendering after image updates

### 3. Final Validation
- Complete build test
- Development server test
- Visual regression check
- Functionality verification

### 4. Rollback Plan
- Keep backup of original files
- Document each change for easy reversal
- Test rollback procedure

## Implementation Phases

### Phase 1: Preparation
- Backup current state
- Create new image directory structure
- Copy and rename logo image

### Phase 2: Code Updates
- Update all component image references
- Update meta tags in index.html
- Update Supabase function references

### Phase 3: Configuration Cleanup
- Remove lovable-tagger from vite.config.ts
- Remove dependency from package.json
- Regenerate package-lock.json

### Phase 4: Documentation
- Update README.md
- Remove Lovable references
- Add independent setup instructions

### Phase 5: Cleanup
- Remove lovable-uploads directory
- Verify no remaining references
- Final testing