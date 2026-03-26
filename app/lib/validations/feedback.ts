import { z } from 'zod';

const FEEDBACK_CATEGORIES = [
  'BUG',
  'UX',
  'FEATURE',
  'CONTENT',
  'OTHER',
] as const;

export const productFeedbackSchema = z
  .object({
    category: z.enum(FEEDBACK_CATEGORIES),
    title: z.string().trim().min(8, 'O título deve ter ao menos 8 caracteres.').max(140, 'O título deve ter no máximo 140 caracteres.'),
    description: z.string().trim().min(20, 'Descreva melhor o contexto (mínimo de 20 caracteres).').max(3000, 'A descrição deve ter no máximo 3000 caracteres.'),
    expectedBehavior: z
      .string()
      .trim()
      .max(1200, 'O comportamento esperado deve ter no máximo 1200 caracteres.')
      .optional(),
    pagePath: z
      .string()
      .trim()
      .max(200, 'A página informada deve ter no máximo 200 caracteres.')
      .optional(),
    impact: z
      .string()
      .trim()
      .max(600, 'O impacto deve ter no máximo 600 caracteres.')
      .optional(),
    honey: z.string().max(0).optional(),
  })
  .strict();

export type ProductFeedbackPayload = z.infer<typeof productFeedbackSchema>;
