# Icon Requirements for VCHome Hospital Desktop App

## Required Icon Sizes

### Windows (.ico)
- 16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256 pixels
- File: `public/favicon.ico`

### macOS (.icns)
- 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024 pixels
- File: `build/icon.icns`

### Linux (.png)
- 512x512 pixels
- File: `build/icon.png`

## Icon Design Guidelines

### Medical Theme
- Use medical cross or hospital symbol
- Blue and white color scheme (matching VCHome Hospital branding)
- Clean, professional appearance
- Readable at small sizes

### Suggested Design Elements
- Medical cross (✚)
- Hospital building silhouette
- Vaccine/syringe icon
- VCHome Hospital initials (VCH)

## Creating Icons

### Option 1: Online Icon Generator
1. Create a 1024x1024 PNG design
2. Use online tools like:
   - https://www.icoconverter.com/
   - https://iconverticons.com/
   - https://favicon.io/

### Option 2: Manual Creation
1. Design in Photoshop/GIMP/Figma
2. Export multiple sizes
3. Use electron-icon-builder:
   ```bash
   npm install -g electron-icon-builder
   electron-icon-builder --input=./icon.png --output=./build --flatten
   ```

## Temporary Solution
For now, we'll use the existing favicon.ico and create a simple medical-themed icon.

## Icon Placement
```
public/
├── favicon.ico          # Windows icon
build/
├── icon.icns           # macOS icon  
├── icon.png            # Linux icon
├── icons/
    ├── 16x16.png
    ├── 32x32.png
    ├── 64x64.png
    ├── 128x128.png
    ├── 256x256.png
    └── 512x512.png
```