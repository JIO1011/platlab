import { z } from 'zod';

export const healthResponse = z.object({
  status: z.literal('ok'),
  service: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponse>;
