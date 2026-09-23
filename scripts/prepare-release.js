const fs=require('fs'); const path=require('path');
const pkgPath=path.join(__dirname,'..','package.json');
const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
const [major,minor,patch]=pkg.version.split('.').map(Number);
if([major,minor,patch].some(Number.isNaN)) throw new Error(`Invalid version: ${pkg.version}`);
pkg.version=`${major}.${minor}.${patch+1}`;
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n');
console.log(pkg.version);
