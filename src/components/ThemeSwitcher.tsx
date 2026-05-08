import { Monitor, Moon, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ThemePreference, useThemePreference } from "@/lib/theme";

const themeOptions: Array<{ id: ThemePreference; label: string; icon: LucideIcon }> = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "glass-light", label: "Glass Light", icon: Sparkles },
  { id: "system", label: "System", icon: Monitor },
];

export function ThemeSwitcher() {
  const { preference, resolvedTheme, setPreference } = useThemePreference();

  return (
    <div className="theme-switcher" role="radiogroup" aria-label="Theme selection" title={`Resolved theme: ${resolvedTheme}`}>
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const selected = preference === option.id;

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn("theme-switcher-option", selected && "theme-switcher-option-active")}
            onClick={() => setPreference(option.id)}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
