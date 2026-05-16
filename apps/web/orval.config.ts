import { defineConfig } from 'orval';

/**
 * Đọc OpenAPI spec đã download (scripts/fetch-openapi.ts) và sinh:
 *   - TanStack Query hooks (useXxx)
 *   - Types từ schemas
 *   - Mutator dùng apiClient (axios + JWT interceptor đã wire sẵn)
 *
 * Output đặt ở src/lib/api/generated/. KHÔNG sửa tay — luôn regen bằng:
 *   pnpm --filter web generate:api
 */
export default defineConfig({
  petclinic: {
    input: {
      target: './openapi/petclinic-api.json',
    },
    output: {
      mode: 'tags-split',
      target: './src/lib/api/generated/endpoints.ts',
      schemas: './src/lib/api/generated/model',
      client: 'react-query',
      httpClient: 'axios',
      override: {
        mutator: {
          path: './src/lib/api/mutator.ts',
          name: 'apiMutator',
        },
        query: {
          useQuery: true,
          useSuspenseQuery: true,
          useMutation: true,
          signal: true,
        },
      },
      clean: true,
      prettier: true,
    },
  },
});
