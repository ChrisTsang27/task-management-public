"use client";

import React from "react";

import * as Select from "@radix-ui/react-select";
import { clsx } from "clsx";

type Item = { value: string; label: string };

export default function RdxSelect({
  value,
  onValueChange,
  items,
  ariaLabel,
  placeholder,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  items: Item[];
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger
        aria-label={ariaLabel}
        className={clsx(
          "w-full h-10 min-h-10 px-3 py-0 rounded-lg text-sm",
          "flex items-center justify-between gap-2 whitespace-nowrap min-w-0",
          "bg-gradient-to-br from-slate-700 to-slate-800",
          "text-cyan-50 border border-cyan-500/50 hover:border-cyan-400/70 focus:outline-none focus:border-cyan-400 transition-all",
          "shadow-lg",
          className
        )}
      >
        <span className="truncate min-w-0">
          <Select.Value placeholder={placeholder} />
        </span>
        <Select.Icon className="ml-2 shrink-0">▾</Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          side="bottom"
          align="start"
          sideOffset={6}
          avoidCollisions
          className="z-[1000] overflow-hidden rounded-md border border-cyan-500/50 bg-gradient-to-br from-slate-800 to-slate-900 w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)] shadow-xl"
        >
          <Select.ScrollUpButton className="px-2 py-1 text-cyan-200/80">▲</Select.ScrollUpButton>
          <Select.Viewport className="p-1 max-h-[280px] w-full custom-scrollbar">
            {items.map((it) => (
              <Select.Item
                key={it.value}
                value={it.value}
                className={clsx(
                  "select-none rounded-md px-2 h-9 text-sm cursor-pointer whitespace-nowrap truncate",
                  "text-cyan-50 data-[highlighted]:bg-gradient-to-r data-[highlighted]:from-cyan-600 data-[highlighted]:to-cyan-700 data-[highlighted]:outline-none"
                )}
              >
                <Select.ItemText>{it.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="px-2 py-1 text-cyan-200/80">▼</Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}