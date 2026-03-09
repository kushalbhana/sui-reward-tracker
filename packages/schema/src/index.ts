import { z } from "zod";

export const delegatorFormSchema = z.object({
  delegatorAddress: z
    .string()
    .min(1, "Delegator address is required")
    .regex(/^0x[a-fA-F0-9]+$/, "Invalid Sui address format (must start with 0x)"),
  validatorAddress: z
    .string()
    .min(1, "Validator address is required")
    .regex(/^0x[a-fA-F0-9]+$/, "Invalid Sui address format (must start with 0x)"),
  startEpoch: z.coerce
    .number({ invalid_type_error: "Must be a valid number" })
    .int("Must be an integer")
    .nonnegative("Cannot be negative"),
  endEpoch: z.coerce
    .number({ invalid_type_error: "Must be a valid number" })
    .int("Must be an integer")
    .nonnegative("Cannot be negative"),
}).refine((data) => data.startEpoch <= data.endEpoch, {
  message: "Start epoch cannot be greater than end epoch",
  path: ["endEpoch"],
});

export const validatorFormSchema = z.object({
  validatorAddress: z
    .string()
    .min(1, "Validator address is required")
    .regex(/^0x[a-fA-F0-9]+$/, "Invalid Sui address format (must start with 0x)"),
});

export type DelegatorFormValues = z.infer<typeof delegatorFormSchema>;
export type ValidatorFormValues = z.infer<typeof validatorFormSchema>;
