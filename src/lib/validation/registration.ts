import { z } from 'zod';

/**
 * Festival application.
 *
 * Mirrors the official paper form exactly — see the header of `0004_registrations.sql`.
 * Every field here appears on the blank, and no field on the blank is missing.
 */

/** +998 XX XXX XX XX and the other shapes people actually type it in. */
const phonePattern = /^\+?[0-9\s()-]{9,20}$/;

/** Widest sensible span for a vocal competition; also guards typo'd birth years. */
export const MIN_AGE = 8;
export const MAX_AGE = 60;

export const registrationSchema = z
  .object({
    // «ФИО конкурсанта»
    firstName: z.string().trim().min(2).max(80),
    lastName: z.string().trim().min(2).max(80),
    middleName: z.string().trim().max(80).optional().or(z.literal('')),

    // «Дата рождения»
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'invalid_date' }),

    // «Название учебного заведения, факультет, место работы (учебы), должность»
    institution: z.string().trim().max(200).optional().or(z.literal('')),
    faculty: z.string().trim().max(200).optional().or(z.literal('')),
    position: z.string().trim().max(120).optional().or(z.literal('')),

    // «Место жительства» / «E-mail» / «Телефон»
    address: z.string().trim().min(5).max(300),
    email: z.string().trim().toLowerCase().email().max(200),
    phone: z.string().trim().regex(phonePattern),

    // «Программа»: I тур / II тур / III тур
    programmeRound1: z.string().trim().min(3).max(1500),
    programmeRound2: z.string().trim().max(1500).optional().or(z.literal('')),
    programmeRound3: z.string().trim().max(1500).optional().or(z.literal('')),

    // «ФИО концертмейстера, место работы»
    accompanistName: z.string().trim().max(160).optional().or(z.literal('')),
    accompanistWorkplace: z.string().trim().max(200).optional().or(z.literal('')),

    // «Номинация»
    nominationId: z.string().uuid().optional().or(z.literal('')),

    consent: z.literal(true),

    /** Honeypot — see the contact schema. */
    website: z.string().max(0).optional(),
  })
  .superRefine((value, ctx) => {
    const birth = new Date(value.birthDate);
    const now = new Date();

    let age = now.getFullYear() - birth.getFullYear();
    const monthDelta = now.getMonth() - birth.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) age -= 1;

    if (age < MIN_AGE || age > MAX_AGE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['birthDate'],
        message: 'age_out_of_range',
      });
    }
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;
