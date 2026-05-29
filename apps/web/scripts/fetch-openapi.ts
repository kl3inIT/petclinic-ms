#!/usr/bin/env tsx
/**
 * Fetch OpenAPI specs từ gateway aggregator + merge thành 1 spec cho orval.
 *
 * Gateway proxy `/v3/api-docs/{service}` về từng downstream → spec mỗi service
 * lấy được. Script tải 4 spec + merge `paths` + `components.schemas` + `tags`
 * thành 1 file `./openapi/petclinic-api.json`.
 *
 * Yêu cầu: api-gateway đang chạy ở http://localhost:8180.
 *
 * Sử dụng:
 *   pnpm --filter web fetch:openapi
 *
 * Sau đó:
 *   pnpm --filter web generate:api
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const GATEWAY = process.env.GATEWAY_URL ?? 'http://localhost:8180';
const SERVICES = ['auth', 'customers', 'vets', 'visits', 'workflow'] as const;
const OUTPUT = resolve(__dirname, '../openapi/petclinic-api.json');

interface OpenApiSpec {
  openapi: string;
  info: { title: string; version: string; [k: string]: unknown };
  servers?: unknown[];
  tags?: Array<{ name: string; description?: string }>;
  paths?: Record<string, unknown>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

async function fetchSpec(service: string): Promise<OpenApiSpec> {
  const url = `${GATEWAY}/v3/api-docs/${service}`;
  console.log(`  Fetching ${service} from ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${service}: HTTP ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<OpenApiSpec>;
}

function merge(specs: ReadonlyArray<readonly [string, OpenApiSpec]>): OpenApiSpec {
  const merged: OpenApiSpec = {
    openapi: '3.0.1',
    info: {
      title: 'Petclinic MSS301 — Aggregated API',
      version: '1.0.0',
      description: `Aggregated from: ${specs.map(([n]) => n).join(', ')}`,
    },
    servers: [{ url: GATEWAY, description: 'API Gateway' }],
    tags: [],
    paths: {},
    components: { schemas: {}, securitySchemes: {} },
  };

  const tagSet = new Set<string>();

  for (const [service, spec] of specs) {
    // Paths — namespace KHÔNG cần vì BE đã prefix /api/v1/<resource>
    if (spec.paths) {
      for (const [path, ops] of Object.entries(spec.paths)) {
        if (path in merged.paths!) {
          console.warn(`  ! Conflict path ${path} (from ${service}) — last wins`);
        }
        merged.paths![path] = ops;
      }
    }

    // Schemas — collision detection vì có thể trùng tên DTO giữa services
    if (spec.components?.schemas) {
      for (const [name, schema] of Object.entries(spec.components.schemas)) {
        if (name in merged.components!.schemas!) {
          console.warn(`  ! Conflict schema ${name} (from ${service}) — last wins`);
        }
        merged.components!.schemas![name] = schema;
      }
    }

    // Security schemes — gộp, last wins
    if (spec.components?.securitySchemes) {
      Object.assign(merged.components!.securitySchemes!, spec.components.securitySchemes);
    }

    // Tags — dedupe
    if (spec.tags) {
      for (const t of spec.tags) {
        if (!tagSet.has(t.name)) {
          tagSet.add(t.name);
          merged.tags!.push(t);
        }
      }
    }
  }

  return merged;
}

async function main() {
  console.log(`Fetching ${SERVICES.length} service specs via ${GATEWAY}`);

  const specs = await Promise.all(
    SERVICES.map(async (s) => [s, await fetchSpec(s)] as const),
  );

  const merged = merge(specs);
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(merged, null, 2), 'utf8');

  const pathCount = Object.keys(merged.paths ?? {}).length;
  const schemaCount = Object.keys(merged.components?.schemas ?? {}).length;
  console.log(
    `\nSaved ${OUTPUT}\n  paths   : ${pathCount}\n  schemas : ${schemaCount}\n  tags    : ${merged.tags?.length ?? 0}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
