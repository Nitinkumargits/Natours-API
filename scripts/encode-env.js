#!/usr/bin/env node
// Encode prod.env → PROD_ENV_B64 (and keep prod.env.b64 + the in-file mirror in sync).
//
// Run: npm run env:encode
//
// Reads ./prod.env, strips the existing PROD_ENV_B64=... line if present,
// normalizes CRLF → LF, base64-encodes the result, then:
//   1. writes the value to ./prod.env.b64
//   2. updates the PROD_ENV_B64=... line at the top of ./prod.env
//   3. prints the value so you can paste into GitHub Actions secrets
//
// Idempotent — running twice in a row produces the same output.

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '..', 'prod.env');
const B64_FILE = path.join(__dirname, '..', 'prod.env.b64');

if (!fs.existsSync(ENV_FILE)) {
  console.error(`✖ ${ENV_FILE} not found.`);
  process.exit(1);
}

const raw = fs.readFileSync(ENV_FILE, 'utf8');

const plaintextLines = raw
  .split(/\r?\n/)
  .filter((line) => !line.startsWith('PROD_ENV_B64='));

const plaintext = plaintextLines.join('\n').replace(/\s+$/, '') + '\n';

const b64 = Buffer.from(plaintext, 'utf8').toString('base64');

fs.writeFileSync(B64_FILE, b64 + '\n', 'utf8');

const newEnvBody = plaintextLines.join('\n').replace(/^\s*\n/, '');
const updatedEnv =
  `NODE_ENV=production\n\nPROD_ENV_B64=${b64}\n\n` +
  newEnvBody.replace(/^NODE_ENV=production\s*\n/, '').replace(/^\n+/, '');

fs.writeFileSync(ENV_FILE, updatedEnv, 'utf8');

console.log('✔ Encoded prod.env');
console.log(`  → ${B64_FILE}`);
console.log(`  → prod.env line 3 updated`);
console.log(`  → ${b64.length} chars\n`);
console.log('Next step: paste this value into GitHub → Settings → Secrets → PROD_ENV_B64');
console.log('---');
console.log(b64);
