import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  avatarUrl: z.url("Invalid avatar URL format").optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

