// server/scripts/check-env.mjs
//
// Runs before the server starts (npm start). Stops with a clear message
// when a required setting is missing, instead of a confusing error later.

import "dotenv/config";

const required = {
  DATABASE_URL:
    "the shop's database address. On Railway set it to ${{Postgres.DATABASE_URL}}",
  JWT_SECRET:
    "a long random string used to sign logins (different for every shop)",
};

const missing = Object.entries(required).filter(
  ([name]) => !process.env[name]?.trim(),
);

if (missing.length > 0) {
  console.error("\nThe server can't start: missing settings (environment variables).\n");
  for (const [name, help] of missing) {
    console.error(`  - ${name}: ${help}`);
  }
  console.error("\nAdd them to the server service's Variables, then redeploy. See DEPLOY.md.\n");
  process.exit(1);
}

if (!process.env.SHOP_NAME?.trim()) {
  console.warn('Note: SHOP_NAME is not set, so the shop is shown as "My Shop".');
}
