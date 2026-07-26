import { z } from 'zod';

/**
 * Contact form.
 *
 * The same schema runs in the browser (react-hook-form resolver) and inside the Server
 * Action. The client copy is a convenience; the server copy is the actual control, since
 * a Server Action is a public HTTP endpoint that anyone can post to directly.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  subject: z.string().trim().max(200).optional().or(z.literal('')),
  message: z.string().trim().min(10).max(4000),

  /**
   * Honeypot. Hidden from sighted users and from screen readers, so any value at all
   * means an automated submission. Cheaper and less hostile than a CAPTCHA, and it
   * catches the overwhelming majority of form spam.
   */
  website: z.string().max(0).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
