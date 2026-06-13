import { type VariantProps, cva } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const ringVariants = cva("inline-block animate-spin shrink-0", {
  variants: {
    size: {
      xs: "size-3 border-[1.5px]",
      sm: "size-4 border-2",
      md: "size-6 border-2",
      lg: "size-10 border-[3px]",
      xl: "size-16 border-4",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

type RingProps = Omit<ComponentProps<"span">, "color"> & VariantProps<typeof ringVariants>;

export function Ring({ size, className, ...props }: RingProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "rounded-full border-current border-r-transparent text-primary",
        ringVariants({ size }),
        className,
      )}
      {...props}
    />
  );
}
