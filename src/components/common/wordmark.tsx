import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

/**
 * The official Romansiada Uzbekistan logo lockup: emblem lyre + "ROMANSIADA UZBEKISTAN".
 */
export function Wordmark({
  name,
  region,
  size = 'md',
  className,
}: {
  name?: string;
  region?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  gradientId?: string;
}) {
  const heightClass = {
    sm: 'h-8 sm:h-9',
    md: 'h-10 sm:h-11',
    lg: 'h-12 sm:h-14 md:h-16',
  }[size];

  const altText = name && region ? `${name} ${region}` : 'Romansiada Uzbekistan';

  return (
    <span className={cn('inline-flex items-center gap-2 group shrink-0', className)}>
      <Image
        src="/images/logo-transparent.webp"
        alt={altText}
        width={900}
        height={228}
        className={cn(
          'w-auto object-contain transition-transform duration-500 ease-luxe group-hover:scale-105',
          'dark:brightness-125 dark:drop-shadow-[0_1px_8px_rgba(255,215,0,0.25)]',
          heightClass,
        )}
        priority
      />
    </span>
  );
}

