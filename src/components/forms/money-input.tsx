"use client";

import type * as React from "react";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

/**
 * A money input with a muted `$` prefix that lives inside the field border.
 * The prefix is decorative — not part of the typed value. Later this can grow
 * a trailing unit picker (e.g. $ / %) if we generalize markup methods.
 */
type Props = Omit<React.ComponentProps<"input">, "type" | "inputMode">;

export function MoneyInput({ className, placeholder = "0.00", ...props }: Props) {
  return (
    <InputGroup className={className}>
      <InputGroupAddon>$</InputGroupAddon>
      <InputGroupInput inputMode="decimal" placeholder={placeholder} {...props} />
    </InputGroup>
  );
}
