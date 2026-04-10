import { z } from "zod";

export const createProjectIdSchema = z.string().uuid();
