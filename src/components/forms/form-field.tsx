"use client";

import { type ReactElement, cloneElement } from "react";
import { useController, useFormContext } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  hideError?: boolean;
  className?: string;
  children: ReactElement<Record<string, unknown>>;
};

export function FormField({
  name,
  label,
  description,
  required,
  hideError,
  className,
  children,
}: FormFieldProps) {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name, control });

  const showError = !hideError && fieldState.error?.message;

  const childProps = {
    id: name,
    "aria-invalid": hideError ? undefined : fieldState.invalid || undefined,
    "aria-describedby": showError ? `${name}-error` : undefined,
    ...field,
  };

  return (
    <div className={cn("grid gap-2", className)}>
      {label ? (
        <Label htmlFor={name}>
          {label}
          {required ? <span className="ml-0.5 text-destructive">*</span> : null}
        </Label>
      ) : null}
      {cloneElement(children, childProps)}
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {showError ? (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {fieldState.error?.message}
        </p>
      ) : null}
    </div>
  );
}
