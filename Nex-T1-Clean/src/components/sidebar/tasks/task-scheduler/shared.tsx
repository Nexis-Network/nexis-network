import type { ComponentProps } from "react";

import { FormLabel } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export type SchedulerFormLabelProps = ComponentProps<typeof FormLabel>;

export const SchedulerFormLabel = ({ className, ...props }: SchedulerFormLabelProps) => (
  <FormLabel className={cn("text-regular", className)} {...props} />
);
