# 🚀 GitHub Pages Setup Guide

## 📋 **การตั้งค่า GitHub Pages สำหรับ VCHome Hospital**

### **1. เปิดใช้งาน GitHub Pages**

#### **ขั้นตอนการตั้งค่า:**
1. ไปที่ **Repository Settings**
2. เลื่อนลงไปหา **Pages** section
3. ตั้งค่าดังนี้:
   - **Source**: Deploy from a branch
   - **Branch**: `gh-pages`
   - **Folder**: `/ (root)`

### **2. ตั้งค่า Environment Variables**

#### **GitHub Secrets ที่ต้องเพิ่ม:**
```
Repository Settings → Secrets and variables → Actions → New repository secret
```

**Required Secrets:**
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Optional Secrets:**
```bash
VITE_GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key
VITE_LINE_CHANNEL_ACCESS_TOKEN=your_line_token
```

### **3. การ Deploy อัตโนมัติ**

#### **Trigger Deployment:**
```bash
# วิธี 1: Push ไปยัง main branch
git add .
git commit -m "Update application"
git push origin main

# วิธี 2: Manual trigger
# ไปที่ GitHub Actions → "Deploy Web Application" → Run workflow
```

#### **URL ที่ได้:**
```
https://moradok.github.io/VaccineHomeBot/
```

### **4. การตรวจสอบ Deployment**

#### **GitHub Actions Status:**
```
https://github.com/MORADOK/VaccineHomeBot/actions
```

#### **GitHub Pages Status:**
```
Repository Settings → Pages → Visit site
```

### **5. Custom Domain (Optional)**

#### **ตั้งค่า Custom Domain:**
1. ไปที่ **Repository Settings → Pages**
2. ใส่ domain ใน **Custom domain** field
3. สร้าง `CNAME` file ใน root directory:

```bash
echo "yourdomain.com" > CNAME
git add CNAME
git commit -m "Add custom domain"
git push origin main
```

#### **DNS Configuration:**
```bash
# CNAME Record
yourdomain.com → moradok.github.io

# A Records (Alternative)
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

### **6. SSL Certificate**

#### **GitHub Pages SSL:**
- ✅ **Automatic HTTPS** - GitHub จัดการให้อัตโนมัติ
- ✅ **Let's Encrypt Certificate** - ฟรีและต่ออายุอัตโนมัติ
- ✅ **Force HTTPS** - เปิดใช้งานใน Settings

### **7. Performance Optimization**

#### **CDN และ Caching:**
- ✅ **GitHub CDN** - Global distribution
- ✅ **Browser Caching** - Static assets cached
- ✅ **Gzip Compression** - Automatic compression

#### **Build Optimization:**
```bash
# Production build with optimizations
npm run build

# File sizes after build
dist/
├── assets/
│   ├── index-[hash].js     # ~500KB (gzipped: ~150KB)
│   ├── index-[hash].css    # ~50KB (gzipped: ~10KB)
│   └── vendor-[hash].js    # ~200KB (gzipped: ~60KB)
└── index.html              # ~5KB
```

### **8. Monitoring และ Analytics**

#### **GitHub Pages Analytics:**
```javascript
// Add to index.html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

#### **Uptime Monitoring:**
- **UptimeRobot**: Free monitoring service
- **StatusCake**: Alternative monitoring
- **GitHub Status**: Check GitHub Pages status

### **9. Backup และ Recovery**

#### **Automatic Backup:**
- ✅ **Git History** - Full version control
- ✅ **GitHub Backup** - Multiple data centers
- ✅ **Branch Protection** - Prevent accidental deletion

#### **Recovery Process:**
```bash
# Restore from previous commit
git revert HEAD
git push origin main

# Restore from specific commit
git reset --hard <commit-hash>
git push --force origin main
```

### **10. Troubleshooting**

#### **Common Issues:**

**1. 404 Errors on Refresh:**
- ✅ **Fixed**: Added 404.html redirect script
- ✅ **SPA Routing**: Configured for React Router

**2. Assets Not Loading:**
```bash
# Check base path in vite.config.ts
base: '/VaccineHomeBot/'

# Check BrowserRouter basename
<BrowserRouter basename="/VaccineHomeBot">
```

**3. Environment Variables:**
```bash
# Check GitHub Secrets
Repository Settings → Secrets and variables → Actions

# Check build logs
GitHub Actions → Deploy Web Application → View logs
```

**4. Build Failures:**
```bash
# Check Node.js version
node-version: '18'

# Check dependencies
npm ci  # Use exact versions from package-lock.json
```

### **11. Security Best Practices**

#### **GitHub Pages Security:**
- ✅ **HTTPS Only** - Force HTTPS enabled
- ✅ **No Server-Side Code** - Static files only
- ✅ **Environment Variables** - Sensitive data in GitHub Secrets
- ✅ **Content Security Policy** - Added CSP headers

#### **Supabase Security:**
- ✅ **Row Level Security** - Database access control
- ✅ **API Keys** - Anon key for public access only
- ✅ **CORS Configuration** - Restrict to GitHub Pages domain

### **12. Performance Metrics**

#### **Expected Performance:**
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.5s
- **Cumulative Layout Shift**: < 0.1

#### **Optimization Techniques:**
- ✅ **Code Splitting** - Lazy loading components
- ✅ **Tree Shaking** - Remove unused code
- ✅ **Asset Optimization** - Compressed images and fonts
- ✅ **Service Worker** - Offline caching (optional)

---

## ✅ **Deployment Checklist**

### **Pre-Deployment:**
- [ ] ตั้งค่า GitHub Secrets
- [ ] ทดสอบ build ใน local
- [ ] ตรวจสอบ environment variables
- [ ] อัพเดท documentation

### **Deployment:**
- [ ] Push code ขึ้น main branch
- [ ] ตรวจสอบ GitHub Actions status
- [ ] ทดสอบ website ใน production
- [ ] ตรวจสอบ mobile compatibility

### **Post-Deployment:**
- [ ] ตั้งค่า monitoring
- [ ] ทดสอบ performance
- [ ] อัพเดท DNS (หากใช้ custom domain)
- [ ] แจ้งผู้ใช้งาน URL ใหม่

---

**🎉 GitHub Pages พร้อมใช้งานแล้ว!**

**URL**: https://moradok.github.io/VaccineHomeBot/