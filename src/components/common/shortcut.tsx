"use client";

import { Fragment } from "react";

import { usePlatform } from "@/components/providers/platform-provider";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

type ShortcutKey = "mod" | "shift" | "alt" | "ctrl" | "enter" | "esc" | "tab" | "space" | string;

type ShortcutProps = {
  keys: ShortcutKey[];
  className?: string;
  separator?: string;
};

const macSymbols: Record<string, string> = {
  mod: "⌘",
  shift: "⇧",
  alt: "⌥",
  ctrl: "⌃",
  enter: "↵",
  esc: "esc",
  tab: "⇥",
  space: "␣",
};

const winSymbols: Record<string, string> = {
  mod: "Ctrl",
  shift: "Shift",
  alt: "Alt",
  ctrl: "Ctrl",
  enter: "Enter",
  esc: "Esc",
  tab: "Tab",
  space: "Space",
};

export function Shortcut({ keys, className, separator }: ShortcutProps) {
  const { platform } = usePlatform();
  const symbols = platform === "mac" ? macSymbols : winSymbols;

  return (
    <KbdGroup className={cn(className)}>
      {keys.map((k, i) => {
        const label = symbols[k] ?? k.toUpperCase();
        return (
          <Fragment key={`${i}-${k}`}>
            {i > 0 && separator ? <span className="text-muted-foreground">{separator}</span> : null}
            <Kbd>{label}</Kbd>
          </Fragment>
        );
      })}
    </KbdGroup>
  );
}
