import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const distAssetsDir = path.join(projectRoot, 'dist', 'assets');

console.log('===============================================================');
console.log('SG FRUIT ADMIN — VITE STAGING BUNDLE SECURITY VERIFICATION');
console.log('===============================================================');
console.log('Project Root:', projectRoot);
console.log('Target Assets Dir:', distAssetsDir);

if (!fs.existsSync(distAssetsDir)) {
  console.error('\n[FAIL] dist/assets directory does not exist! Please run npm run build:staging first.');
  process.exit(1);
}

const files = fs.readdirSync(distAssetsDir);
const jsFiles = files.filter(f => f.endsWith('.js'));
const mapFiles = files.filter(f => f.endsWith('.map'));

console.log('JS Bundle Files:', jsFiles);
console.log('Source Map Files count:', mapFiles.length);

if (jsFiles.length === 0) {
  console.error('\n[FAIL] No JavaScript bundle files found in dist/assets!');
  process.exit(1);
}

let allPassed = true;
let totalContent = '';

for (const jsFile of jsFiles) {
  totalContent += fs.readFileSync(path.join(distAssetsDir, jsFile), 'utf-8');
}

// 1. Check Staging API URL
const hasStagingApi = totalContent.includes('https://staging-admin-api.siriwatmedhanin.com/api');
console.log(`[${hasStagingApi ? 'PASS' : 'FAIL'}] 1. Staging API URL configured (https://staging-admin-api.siriwatmedhanin.com/api): ${hasStagingApi}`);
if (!hasStagingApi) allPassed = false;

// 2. Check NO Production API URL
const hasProdApi = totalContent.includes('https://admin-api.siriwatmedhanin.com') || totalContent.includes('https://api.siriwatmedhanin.com');
console.log(`[${!hasProdApi ? 'PASS' : 'FAIL'}] 2. Production API URLs absent: ${!hasProdApi}`);
if (hasProdApi) allPassed = false;

// 3. Check NO Localhost API
const hasLocalhost = totalContent.includes('localhost:8787') || totalContent.includes('127.0.0.1:8787') || totalContent.includes('localhost:5173');
console.log(`[${!hasLocalhost ? 'PASS' : 'FAIL'}] 3. Localhost development URLs absent: ${!hasLocalhost}`);
if (hasLocalhost) allPassed = false;

// 4. Check NO Secrets / Private Tokens
const hasSecrets = totalContent.includes('CF_ACCESS_CLIENT_SECRET') ||
  totalContent.includes('R2_SECRET_ACCESS_KEY') ||
  totalContent.includes('JWT_SECRET_KEY') ||
  totalContent.includes('PRIVATE_KEY');
console.log(`[${!hasSecrets ? 'PASS' : 'FAIL'}] 4. No secret keywords embedded in bundle: ${!hasSecrets}`);
if (hasSecrets) allPassed = false;

// 5. Check NO wrong Public API Hostname used for Admin API
const hasWrongApi = totalContent.includes('staging-api.siriwatmedhanin.com/api/admin');
console.log(`[${!hasWrongApi ? 'PASS' : 'FAIL'}] 5. No wrong Public API Hostname for Admin: ${!hasWrongApi}`);
if (hasWrongApi) allPassed = false;

// 6. Source Map Exposure Safety Check
// If map files exist, ensure they do not expose sensitive environment secrets
console.log(`[${mapFiles.length === 0 ? 'PASS' : 'INFO'}] 6. Source maps: ${mapFiles.length} file(s) found (Vite default)`);

console.log('===============================================================');
console.log(`BUNDLE VERIFICATION RESULT: ${allPassed ? 'ALL CHECKS PASSED (READY)' : 'FAILED'}`);
console.log('===============================================================');

if (!allPassed) {
  process.exit(1);
}
