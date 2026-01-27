#!/usr/bin/env node

/**
 * Quality Gates Verification Script
 * Checks all Phase 7 success criteria
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function exec(command, cwd = process.cwd()) {
  try {
    return execSync(command, { cwd, encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    return error.stdout || error.message;
  }
}

function checkmark(passed) {
  return passed ? '✅' : '❌';
}

console.log('\n' + '='.repeat(60));
log('🎯 PHASE 7: CI/CD & Documentation Quality Gates', 'blue');
console.log('='.repeat(60) + '\n');

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// 1. Check Documentation Files
log('📄 Checking Documentation Files...', 'yellow');
const requiredDocs = [
  'README.md',
  'DEVELOPMENT.md',
  'API.md',
  'BUG_FIXES.md',
  'QUESTIONS.md',
  'RESEARCH.md',
  'DEPLOYMENT.md'
];

let allDocsExist = true;
requiredDocs.forEach(doc => {
  const exists = fs.existsSync(path.join(__dirname, '..', doc));
  console.log(`  ${checkmark(exists)} ${doc}`);
  if (!exists) allDocsExist = false;
});

if (allDocsExist) {
  results.passed.push('All 7 required documentation files exist');
} else {
  results.failed.push('Missing required documentation files');
}

// 2. Check CI Pipeline Configuration
log('\n🔧 Checking CI/CD Configuration...', 'yellow');
const ciExists = fs.existsSync(path.join(__dirname, '..', '.github', 'workflows', 'ci.yml'));
console.log(`  ${checkmark(ciExists)} GitHub Actions workflow (.github/workflows/ci.yml)`);

const huskyExists = fs.existsSync(path.join(__dirname, '..', '.husky', 'pre-commit'));
console.log(`  ${checkmark(huskyExists)} Husky pre-commit hook`);

const lintStagedExists = fs.existsSync(path.join(__dirname, '..', '.lintstagedrc.json'));
console.log(`  ${checkmark(lintStagedExists)} lint-staged configuration`);

if (ciExists && huskyExists && lintStagedExists) {
  results.passed.push('CI/CD pipeline configured (GitHub Actions + Husky)');
} else {
  results.failed.push('CI/CD pipeline configuration incomplete');
}

// 3. Check ESLint Configuration
log('\n🔍 Checking Linting Configuration...', 'yellow');
const backendEslint = fs.existsSync(path.join(__dirname, '..', 'backend', '.eslintrc.cjs'));
const frontendEslint = fs.existsSync(path.join(__dirname, '..', 'frontend', '.eslintrc.cjs'));
const prettierConfig = fs.existsSync(path.join(__dirname, '..', '.prettierrc.json'));

console.log(`  ${checkmark(backendEslint)} Backend ESLint config`);
console.log(`  ${checkmark(frontendEslint)} Frontend ESLint config`);
console.log(`  ${checkmark(prettierConfig)} Prettier config`);

if (backendEslint && frontendEslint && prettierConfig) {
  results.passed.push('Linting configuration complete');
} else {
  results.failed.push('Missing linting configuration files');
}

// 4. Check Package Scripts
log('\n📦 Checking Package Scripts...', 'yellow');
const rootPackage = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const requiredScripts = ['lint', 'format', 'test', 'build', 'test:coverage'];

let allScriptsExist = true;
requiredScripts.forEach(script => {
  const exists = rootPackage.scripts && rootPackage.scripts[script];
  console.log(`  ${checkmark(exists)} npm run ${script}`);
  if (!exists) allScriptsExist = false;
});

if (allScriptsExist) {
  results.passed.push('All required npm scripts configured');
} else {
  results.failed.push('Missing required npm scripts');
}

// 5. Test Build Performance
log('\n⚡ Testing Production Build Performance...', 'yellow');
console.log('  Building frontend...');
const buildStart = Date.now();
const buildOutput = exec('npm run build', path.join(__dirname, '..', 'frontend'));
const buildTime = (Date.now() - buildStart) / 1000;

const buildUnder10s = buildTime < 10;
console.log(`  ${checkmark(buildUnder10s)} Build time: ${buildTime.toFixed(2)}s (target: <10s)`);

if (buildUnder10s) {
  results.passed.push(`Production build under 10s (${buildTime.toFixed(2)}s)`);
} else {
  results.failed.push(`Build time ${buildTime.toFixed(2)}s exceeds 10s target`);
}

// 6. Check Bundle Size
if (buildOutput.includes('dist/')) {
  const distPath = path.join(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(path.join(distPath, 'assets'));
    const totalSize = files.reduce((acc, file) => {
      const stat = fs.statSync(path.join(distPath, 'assets', file));
      return acc + stat.size;
    }, 0);
    const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
    const sizeOk = totalSize < 1024 * 1024; // <1MB
    console.log(`  ${checkmark(sizeOk)} Bundle size: ${sizeMB}MB (target: <1MB)`);
    
    if (sizeOk) {
      results.passed.push(`Bundle size optimized (${sizeMB}MB)`);
    } else {
      results.warnings.push(`Bundle size ${sizeMB}MB could be optimized further`);
    }
  }
}

// 7. Environment Variables Documentation
log('\n🔐 Checking Environment Configuration...', 'yellow');
const envExampleExists = fs.existsSync(path.join(__dirname, '..', 'backend', '.env.example')) ||
                         fs.existsSync(path.join(__dirname, '..', 'backend', '.env'));
console.log(`  ${checkmark(envExampleExists)} Backend environment config exists`);

if (envExampleExists) {
  results.passed.push('Environment variables documented');
} else {
  results.warnings.push('Consider adding .env.example file');
}

// Summary
console.log('\n' + '='.repeat(60));
log('📊 QUALITY GATES SUMMARY', 'blue');
console.log('='.repeat(60) + '\n');

log(`✅ PASSED: ${results.passed.length}`, 'green');
results.passed.forEach(item => log(`  ✓ ${item}`, 'green'));

if (results.failed.length > 0) {
  log(`\n❌ FAILED: ${results.failed.length}`, 'red');
  results.failed.forEach(item => log(`  ✗ ${item}`, 'red'));
}

if (results.warnings.length > 0) {
  log(`\n⚠️  WARNINGS: ${results.warnings.length}`, 'yellow');
  results.warnings.forEach(item => log(`  ⚠ ${item}`, 'yellow'));
}

// Final Verdict
console.log('\n' + '='.repeat(60));
const allPassed = results.failed.length === 0;
if (allPassed) {
  log('🎉 ALL QUALITY GATES PASSED! Phase 7 Complete!', 'green');
} else {
  log('⚠️  SOME QUALITY GATES FAILED - Review Required', 'red');
}
console.log('='.repeat(60) + '\n');

// Exit with appropriate code
process.exit(allPassed ? 0 : 1);
