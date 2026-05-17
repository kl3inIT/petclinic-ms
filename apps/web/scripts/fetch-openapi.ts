#!/usr/bin/env tsx
/**
 * Download OpenAPI aggregate spec từ api-gateway (springdoc) và lưu vào ./openapi/.
 * Yêu cầu: api-gateway đang chạy ở http://localhost:8180.
 *
 * Sử dụng:
 *   pnpm --filter web fetch:openapi
 *
 * Sau khi tải xong, chạy:
 *   pnpm --filter web generate:api
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_URL = process.env.OPENAPI_SPEC_URL ?? 'http://localhost:8180/v3/api-docs';
const OUTPUT = resolve(__dirname, '../openapi/petclinic-api.json');

async function main() {
  console.log(`Fetching OpenAPI spec from ${SPEC_URL}`);

  const res = await fetch(SPEC_URL);
  if (!res.ok) {
    throw new Error(`Failed: HTTP ${res.status} ${res.statusText}`);
  }

  const spec = await res.json();
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(spec, null, 2), 'utf8');

  console.log(`Saved ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
