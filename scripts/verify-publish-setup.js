#!/usr/bin/env node

/**
 * Verify GitHub Releases Publishing Setup
 * 
 * This script checks if everything is configured correctly for publishing
 * releases to GitHub.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🔍 Verifying GitHub Releases Publishing Setup...\n');

let hasErrors = false;
let hasWarnings = false;

// Check 1: package.json exists and has correct configuration
console.log('📦 Checking package.json configuration...');
try {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
  );

  // Check version
  if (packageJson.version) {
    console.log(`   ✅ Version: ${packageJson.version}`);
  } else {
    console.log('   ❌ Version not found in package.json');
    hasErrors = true;
  }

  // Check build configuration
  if (packageJson.build && packageJson.build.publish) {
    const publish = packageJson.build.publish[0];
    if (publish.provider === 'github') {
      console.log(`   ✅ GitHub provider configured`);
      console.log(`   ✅ Owner: ${publish.owner}`);
      console.log(`   ✅ Repo: ${publish.repo}`);
    } else {
      console.log('   ❌ GitHub provider not configured');
      hasErrors = true;
    }
  } else {
    console.log('   ❌ Publish configuration not found');
    hasErrors = true;
  }

  // Check electron-updater dependency
  if (packageJson.dependencies && packageJson.dependencies['electron-updater']) {
    console.log(`   ✅ electron-updater: ${packageJson.dependencies['electron-updater']}`);
  } else {
    console.log('   ❌ electron-updater not installed');
    hasErrors = true;
  }

  // Check electron-builder devDependency
  if (packageJson.devDependencies && packageJson.devDependencies['electron-builder']) {
    console.log(`   ✅ electron-builder: ${packageJson.devDependencies['electron-builder']}`);
  } else {
    console.log('   ❌ electron-builder not installed');
    hasErrors = true;
  }

  // Check publish scripts
  if (packageJson.scripts) {
    const hasPublishWin = packageJson.scripts['publish-win'];
    const hasPublishDraft = packageJson.scripts['publish-draft'];
    
    if (hasPublishWin) {
      console.log('   ✅ publish-win script available');
    } else {
      console.log('   ⚠️  publish-win script not found (optional)');
      hasWarnings = true;
    }

    if (hasPublishDraft) {
      console.log('   ✅ publish-draft script available');
    } else {
      console.log('   ⚠️  publish-draft script not found (optional)');
      hasWarnings = true;
    }
  }

} catch (error) {
  console.log(`   ❌ Error reading package.json: ${error.message}`);
  hasErrors = true;
}

console.log('');

// Check 2: GitHub token
console.log('🔑 Checking GitHub token...');
const ghToken = process.env.GH_TOKEN;

if (ghToken) {
  console.log('   ✅ GH_TOKEN environment variable is set');
  
  // Verify token format
  if (ghToken.startsWith('ghp_') || ghToken.startsWith('github_pat_')) {
    console.log('   ✅ Token format looks correct');
    
    // Test token validity
    console.log('   🔄 Testing token validity...');
    testGitHubToken(ghToken);
  } else {
    console.log('   ⚠️  Token format may be incorrect (should start with ghp_ or github_pat_)');
    hasWarnings = true;
  }
} else {
  console.log('   ❌ GH_TOKEN environment variable not set');
  console.log('   💡 Set it with: set GH_TOKEN=your_token_here');
  console.log('   💡 Or add to .env file: GH_TOKEN=your_token_here');
  hasErrors = true;
}

console.log('');

// Check 3: .env file
console.log('📄 Checking .env file...');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('   ✅ .env file exists');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('GH_TOKEN=')) {
    console.log('   ✅ GH_TOKEN found in .env file');
  } else {
    console.log('   ⚠️  GH_TOKEN not found in .env file');
    hasWarnings = true;
  }
} else {
  console.log('   ⚠️  .env file not found (optional if using environment variable)');
  hasWarnings = true;
}

console.log('');

// Check 4: .gitignore
console.log('🚫 Checking .gitignore...');
const gitignorePath = path.join(__dirname, '..', '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  if (gitignoreContent.includes('.env')) {
    console.log('   ✅ .env is in .gitignore (security)');
  } else {
    console.log('   ⚠️  .env should be in .gitignore to prevent token leaks');
    hasWarnings = true;
  }
} else {
  console.log('   ⚠️  .gitignore not found');
  hasWarnings = true;
}

console.log('');

// Check 5: Auto-updater files
console.log('🔄 Checking auto-updater files...');
const autoUpdaterPath = path.join(__dirname, '..', 'public', 'auto-updater.js');
const updateManagerPath = path.join(__dirname, '..', 'public', 'update-manager.js');

if (fs.existsSync(autoUpdaterPath)) {
  console.log('   ✅ auto-updater.js exists');
} else {
  console.log('   ❌ auto-updater.js not found');
  hasErrors = true;
}

if (fs.existsSync(updateManagerPath)) {
  console.log('   ✅ update-manager.js exists');
} else {
  console.log('   ❌ update-manager.js not found');
  hasErrors = true;
}

console.log('');

// Check 6: GitHub Actions workflow
console.log('⚙️  Checking GitHub Actions workflow...');
const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'release.yml');
if (fs.existsSync(workflowPath)) {
  console.log('   ✅ release.yml workflow exists');
  console.log('   💡 Automated releases will work when you push tags');
} else {
  console.log('   ⚠️  release.yml workflow not found (optional)');
  console.log('   💡 You can still publish manually');
  hasWarnings = true;
}

console.log('');

// Check 7: Release directory
console.log('📁 Checking release directory...');
const releasePath = path.join(__dirname, '..', 'release');
if (fs.existsSync(releasePath)) {
  console.log('   ✅ release/ directory exists');
  
  // Check for latest.yml
  const latestYmlPath = path.join(releasePath, 'latest.yml');
  if (fs.existsSync(latestYmlPath)) {
    console.log('   ✅ latest.yml found (from previous build)');
    
    // Read and display version
    const latestYml = fs.readFileSync(latestYmlPath, 'utf8');
    const versionMatch = latestYml.match(/version:\s*(.+)/);
    if (versionMatch) {
      console.log(`   📌 Last built version: ${versionMatch[1]}`);
    }
  } else {
    console.log('   ℹ️  latest.yml not found (will be created on first build)');
  }
} else {
  console.log('   ℹ️  release/ directory not found (will be created on first build)');
}

console.log('');

// Summary
console.log('═'.repeat(60));
console.log('📊 SUMMARY');
console.log('═'.repeat(60));

if (!hasErrors && !hasWarnings) {
  console.log('✅ All checks passed! You are ready to publish releases.');
  console.log('');
  console.log('Next steps:');
  console.log('1. Update version in package.json');
  console.log('2. Run: npm run publish-win');
  console.log('   or: npm run publish-draft (for draft release)');
  console.log('');
  process.exit(0);
} else if (hasErrors) {
  console.log('❌ Setup has errors that must be fixed before publishing.');
  console.log('');
  console.log('Please fix the errors above and run this script again.');
  console.log('');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Setup is functional but has some warnings.');
  console.log('');
  console.log('You can publish, but consider addressing the warnings above.');
  console.log('');
  process.exit(0);
}

// Helper function to test GitHub token
function testGitHubToken(token) {
  const options = {
    hostname: 'api.github.com',
    path: '/user',
    method: 'GET',
    headers: {
      'Authorization': `token ${token}`,
      'User-Agent': 'VCHome-Hospital-Setup-Verification'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const user = JSON.parse(data);
          console.log(`   ✅ Token is valid (authenticated as: ${user.login})`);
        } catch (e) {
          console.log('   ✅ Token is valid');
        }
      } else if (res.statusCode === 401) {
        console.log('   ❌ Token is invalid or expired');
        hasErrors = true;
      } else {
        console.log(`   ⚠️  Unexpected response: ${res.statusCode}`);
        hasWarnings = true;
      }
    });
  });

  req.on('error', (error) => {
    console.log(`   ⚠️  Could not verify token: ${error.message}`);
    hasWarnings = true;
  });

  req.setTimeout(5000, () => {
    req.destroy();
    console.log('   ⚠️  Token verification timed out');
    hasWarnings = true;
  });

  req.end();
}
