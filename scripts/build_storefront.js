/**
 * SG FRUIT — Storefront Production/Staging Build Script
 * Packages only public web assets into dist/ for Cloudflare Pages deployment.
 * Strictly excludes internal documentation, agent skills, scripts, and checkpoints.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { buildProductPages } from './build_product_pages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// Internal files and directories that MUST NEVER be deployed
const FORBIDDEN_PATTERNS = [
  'SKILL.md',
  'mae_chawi_avocado_scroll',
  'checkpoints',
  '.agents',
  'scripts',
  'server.ps1',
  'serve_storefront.js',
  'run_e2e_24_flows.js',
  '.git',
  '.gitignore',
  'package.json'
];

function cleanDist() {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function build() {
  console.log('===============================================================');
  console.log('SG FRUIT STOREFRONT — CLOUDFLARE PAGES BUILD PIPELINE');
  console.log(`Source: ${ROOT_DIR}`);
  console.log(`Destination: ${DIST_DIR}`);
  console.log('===============================================================\n');

  cleanDist();

  // 0. Pre-render Dedicated Product SEO Pages & update sitemap.xml
  try {
    await buildProductPages();
  } catch (err) {
    console.warn('[WARN] buildProductPages had a warning:', err.message);
  }

  // 1. Copy index.html
  console.log('[1/4] Copying index.html...');
  fs.copyFileSync(path.join(ROOT_DIR, 'index.html'), path.join(DIST_DIR, 'index.html'));

  // 2. Copy js/
  console.log('[2/4] Copying js/ directory...');
  copyRecursive(path.join(ROOT_DIR, 'js'), path.join(DIST_DIR, 'js'));

  // 3. Copy Pic/
  console.log('[3/4] Copying Pic/ directory...');
  copyRecursive(path.join(ROOT_DIR, 'Pic'), path.join(DIST_DIR, 'Pic'));

  // 4. Copy public/ if exists
  if (fs.existsSync(path.join(ROOT_DIR, 'public'))) {
    console.log('[4/4] Copying public/ directory...');
    copyRecursive(path.join(ROOT_DIR, 'public'), path.join(DIST_DIR, 'public'));
  }

  // 4.0 Copy css/ directory (centralized cart drawer & checkout ui)
  if (fs.existsSync(path.join(ROOT_DIR, 'css'))) {
    console.log('[4.0] Copying css/ directory to dist/css...');
    copyRecursive(path.join(ROOT_DIR, 'css'), path.join(DIST_DIR, 'css'));
    console.log('[PASS] css packaged for Cloudflare Pages successfully.');
  }

  // 4.1 Copy SEO & Crawler Files (robots.txt, sitemap.xml, llms.txt, CNAME)
  const seoFiles = ['robots.txt', 'sitemap.xml', 'llms.txt', 'CNAME'];
  for (const file of seoFiles) {
    const src = path.join(ROOT_DIR, file);
    if (fs.existsSync(src)) {
      console.log(`Copying ${file} to dist/...`);
      fs.copyFileSync(src, path.join(DIST_DIR, file));
    }
  }

  // 4.2 Copy Category SEO Landing Pages (Cloudflare Pages cleanly serves <slug>.html as /<slug> with 200)
  const categorySlugs = ['seasonal-fruits', 'imported-produce', 'fresh-vegetables'];
  for (const slug of categorySlugs) {
    const htmlFile = `${slug}.html`;
    const srcHtml = path.join(ROOT_DIR, htmlFile);
    if (fs.existsSync(srcHtml)) {
      console.log(`Copying ${htmlFile} to dist/...`);
      fs.copyFileSync(srcHtml, path.join(DIST_DIR, htmlFile));
    }
  }

  // 4.3 Copy Dedicated Product SEO Landing Pages (Cloudflare Pages cleanly serves products/<slug>.html as /products/<slug> with 200)
  if (fs.existsSync(path.join(ROOT_DIR, 'products'))) {
    console.log('[4.3] Copying products/ directory to dist/products...');
    copyRecursive(path.join(ROOT_DIR, 'products'), path.join(DIST_DIR, 'products'));
    console.log('[PASS] products packaged for Cloudflare Pages successfully.');
  }

  // 4.4 Cloudflare Pages Functions (Dynamic Open Graph Middleware & SSR)
  if (fs.existsSync(path.join(ROOT_DIR, 'functions'))) {
    console.log('[4.4] Copying Cloudflare Pages Functions to dist/functions...');
    copyRecursive(path.join(ROOT_DIR, 'functions'), path.join(DIST_DIR, 'functions'));
    console.log('[PASS] functions packaged for Cloudflare Pages successfully.');
  }

  // 5. Create Cloudflare Pages _headers file for security and SEO
  const headersContent = `/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/Pic/*
  Cache-Control: public, max-age=604800, immutable

/css/*
  Cache-Control: public, max-age=0, must-revalidate

/js/*
  Cache-Control: public, max-age=0, must-revalidate

/robots.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: public, max-age=86400

/sitemap.xml
  Content-Type: application/xml; charset=utf-8
  Cache-Control: public, max-age=86400

/llms.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: public, max-age=86400
`;
  fs.writeFileSync(path.join(DIST_DIR, '_headers'), headersContent, 'utf8');

  // 6. Security Audit: Verify NO forbidden files in dist/
  console.log('\n--- Running Security & Asset Exclusion Audit ---');
  let leakFound = false;

  function auditDir(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relPath = path.relative(DIST_DIR, fullPath);

      for (const forbidden of FORBIDDEN_PATTERNS) {
        if (relPath.includes(forbidden)) {
          console.error(`[SECURITY LEAK DETECTED] Forbidden file in dist: ${relPath}`);
          leakFound = true;
        }
      }

      if (fs.statSync(fullPath).isDirectory()) {
        auditDir(fullPath);
      }
    }
  }

  auditDir(DIST_DIR);

  if (leakFound) {
    throw new Error('Build failed: Security leak detected in dist output.');
  }

  console.log('[PASS] Security Audit: All internal files strictly excluded from dist.');
  console.log('[PASS] Build completed successfully. dist/ is ready for Cloudflare Pages deployment.');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
