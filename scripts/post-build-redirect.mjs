// Post-build step for the static export.
//
// Next's middleware can't run in a static export, so we replace
// out/index.html (which would otherwise be the upstream landing page)
// with a tiny meta-refresh redirect to /lobby/. End result: visiting
// the deployment root lands the user on our lobby UI, the same way
// middleware.ts used to handle it during the Next.js server era.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'out');
const target = path.join(outDir, 'index.html');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=./lobby/" />
    <title>Redirecting…</title>
  </head>
  <body>
    <p>Redirecting to <a href="./lobby/">/lobby/</a>…</p>
    <script>window.location.replace('./lobby/');</script>
  </body>
</html>
`;

try {
  await fs.access(outDir);
} catch {
  console.error(`post-build-redirect: ${outDir} does not exist - run \`next build\` first.`);
  process.exit(1);
}

await fs.writeFile(target, html, 'utf8');
console.log(`post-build-redirect: wrote redirect at ${target}`);
