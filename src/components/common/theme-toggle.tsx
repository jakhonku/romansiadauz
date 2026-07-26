'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export interface ThemeToggleLabels {
  theme: string;
  light: string;
  dark: string;
  system: string;
}

/**
 * Light / dark / system switch.
 *
 * The icon cannot be rendered on the server: the resolved theme depends on a
 * `localStorage` value and the OS media query, so server HTML and the first client
 * render would disagree and React would log a hydration mismatch. Until mounted we
 * render the same neutral placeholder on both sides, which reserves the exact layout
 * box and therefore shifts nothing when the real icon appears.
 */
export function ThemeToggle({ labels }: { labels: ThemeToggleLabels }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon-sm" aria-label={labels.theme} disabled>
        <Sun className="size-[1.15rem] opacity-40" />
      </Button>
    );
  }

  const Icon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={labels.theme}>
          <Icon className="size-[1.15rem]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun /> {labels.light}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon /> {labels.dark}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor /> {labels.system}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
