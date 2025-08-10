#!/usr/bin/env node
/**
 * Build (if needed) and create a deployable zip for AWS Amplify (SSR) or generic EC2/Elastic Beanstalk.
 * It leverages Next.js standalone output.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const distDir = path.join(root, '.next');
const standaloneServerDir = path.join(distDir, 'standalone');
const zipName = 'next-standalone.zip';

function run(cmd) {
  console.log('> ' + cmd);
  execSync(cmd, { stdio: 'inherit' });
}

// 1. Ensure build exists (standalone)
if (!fs.existsSync(standaloneServerDir)) {
  console.log('Standalone build not found. Running build with STANDALONE=true ...');
  run(process.platform === 'win32' ? 'cross-env STANDALONE=true pnpm run build' : 'STANDALONE=true pnpm run build');
}

if (!fs.existsSync(standaloneServerDir)) {
  console.error('Standalone directory still missing after build. Aborting.');
  process.exit(1);
}

// 2. Prepare a temp staging directory
const staging = path.join(root, 'dist-standalone');
if (fs.existsSync(staging)) {
  fs.rmSync(staging, { recursive: true, force: true });
}
fs.mkdirSync(staging);

// Copy standalone content
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(path.join(standaloneServerDir), path.join(staging));
// Public assets (if not already included)
const publicDir = path.join(root, 'public');
if (fs.existsSync(publicDir)) {
  copyRecursive(publicDir, path.join(staging, 'public'));
}

// Next static/.next/static assets
const staticDir = path.join(distDir, 'static');
if (fs.existsSync(staticDir)) {
  copyRecursive(staticDir, path.join(staging, '.next', 'static'));
}

// 3. Create a simple server start script if not present
const serverJs = path.join(staging, 'server.js');
if (!fs.existsSync(serverJs)) {
  fs.writeFileSync(serverJs, `// Auto-generated server launcher\nconst { createServer } = require('http');\nconst next = require('next');\nconst port = process.env.PORT || 3000;\nconst app = next({ dev: false, dir: __dirname });\nconst handle = app.getRequestHandler();\napp.prepare().then(() => {\n  createServer((req, res) => {\n    handle(req, res);\n  }).listen(port, () => {\n    console.log('> Server ready on :' + port);\n  });\n});\n`);
}

// 4. Zip it
const archiver = require('archiver');
const output = fs.createWriteStream(path.join(root, zipName));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Created ${zipName} (${archive.pointer()} bytes)`);
});

archive.on('error', (err) => { throw err; });
archive.pipe(output);
archive.directory(staging + '/', false);
archive.finalize();
