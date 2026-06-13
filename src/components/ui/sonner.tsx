"use client";

import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { Ring } from "@/components/ui/ring";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        error: <TriangleAlertIcon className="size-4 text-destructive" />,
        loading: <Ring size="sm" className="text-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group/toast pointer-events-auto flex w-full items-center gap-3 rounded-lg border border-border bg-popover py-3 pl-3.5 pr-11 text-popover-foreground shadow-md",
          content: "flex flex-col gap-0.5 min-w-0 flex-1",
          title: "text-sm font-medium text-foreground",
          description: "text-xs text-muted-foreground",
          icon: "shrink-0 mt-0.5",
          actionButton:
            "shrink-0 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted",
          cancelButton:
            "shrink-0 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted",
          closeButton:
            "!left-auto !right-2 !top-0 !bottom-0 !my-auto !translate-x-0 !translate-y-0 size-7 rounded-md !border-0 !bg-transparent !text-muted-foreground hover:!bg-muted hover:!text-foreground [&>svg]:size-4",
          success: "!border-success",
          error: "!border-destructive",
          loading: "!border-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
