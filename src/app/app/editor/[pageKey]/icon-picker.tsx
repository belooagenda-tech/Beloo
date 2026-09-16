"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ICONS, ICON_KEYS, type IconKey } from "@/lib/layout-editor/icons";

export function IconPicker({ value, onChange }: { value: string; onChange: (v: IconKey) => void }) {
  const currentKey = (ICON_KEYS as readonly string[]).includes(value) ? (value as IconKey) : ICON_KEYS[0];
  const SelectedIcon = ICONS[currentKey];

  return (
    <Select value={currentKey} onValueChange={(v) => v && onChange(v as IconKey)}>
      <SelectTrigger className="w-full">
        <SelectValue>
          {() => (
            <span className="flex items-center gap-1.5">
              <SelectedIcon className="size-4" />
              {currentKey}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ICON_KEYS.map((key) => {
          const Icon = ICONS[key];
          return (
            <SelectItem key={key} value={key}>
              <Icon className="size-4" />
              {key}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
