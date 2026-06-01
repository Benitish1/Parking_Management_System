// Copies every backend service's .env.example -> .env if missing.
// (The frontend is a separate project — set up its .env from frontend/.env.example.)
// Usage: node scripts/setup-env.mjs   (or: npm run setup:env)
import { copyFileSync, existsSync } from 'fs'; // copyFileSync = duplicate a file; existsSync = check a path exists
import { join, dirname } from 'path';
import { fileURLToPath } from 'url'; // needed to turn this ES module's URL into a normal file path

// In an ES module there is no __dirname, so we derive it from import.meta.url,
// then go up one level (..) to reach the "backend" folder that holds all services.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Every backend microservice we want to bootstrap a .env for.
// Listing them explicitly keeps the script predictable (no folder scanning).
const targets = [
  'services/api-gateway',
  'services/auth-service',
  'services/user-service',
  'services/parking-service',
  'services/car-entry-service',
  'services/report-service',
  'services/notification-service',
];

let created = 0; // counter so we can report how many files we actually made
for (const t of targets) {
  const example = join(root, t, '.env.example'); // the committed template (safe to share)
  const env = join(root, t, '.env'); // the real config file (git-ignored, holds secrets)
  // Only copy when the template exists AND no .env is present yet.
  // This makes the script safe to re-run: we never overwrite an existing .env.
  if (existsSync(example) && !existsSync(env)) {
    copyFileSync(example, env);
    console.log(`✓ created ${t}/.env`);
    created++;
  } else if (existsSync(env)) {
    // A real .env already exists — leave it untouched so we don't wipe local secrets.
    console.log(`• ${t}/.env already exists — skipped`);
  } else {
    // No template to copy from — likely a missing/renamed service folder.
    console.log(`! ${t}/.env.example not found — skipped`);
  }
}
console.log(`\nDone. ${created} .env file(s) created.`);
console.log('Remember: every service must share the SAME JWT_SECRET and DB connection.');
