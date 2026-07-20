import type { CreatePrescriptionRequest } from '@/lib/api/generated/model';

/** Remove after OpenAPI is regenerated from the running visits-service. */
export type IdempotentPrescriptionRequest = CreatePrescriptionRequest & {
  idempotencyKey: string;
};
