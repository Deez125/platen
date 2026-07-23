"use client";

import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type RangeOption = { value: string; label: string };

/**
 * Date-range picker for the dashboard. The choice lives in the URL so the server
 * page can read it directly; the default range navigates to a clean /dashboard.
 */
export function RangeSelect({
  value,
  defaultValue,
  options,
}: {
  value: string;
  defaultValue: string;
  options: RangeOption[];
}) {
  const router = useRouter();

  return (
    <Select
      value={value}
      onValueChange={(next) =>
        router.push(next === defaultValue ? "/dashboard" : `/dashboard?range=${next}`)
      }
    >
      <SelectTrigger size="sm" className="w-40" aria-label="Date range">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
