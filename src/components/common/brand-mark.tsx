import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

/**
 * The festival emblem: official lyre logo mark from Romansiada Uzbekistan.
 */
export function BrandMark({
  className,
  title = 'Romansiada Emblem',
}: {
  className?: string;
  gradientId?: string;
  title?: string;
}) {
  return (
    <span className={cn('relative inline-flex items-center justify-center shrink-0 h-10 w-10', className)}>
      <Image
        src="/images/logo-emblem.webp"
        alt={title}
        width={300}
        height={404}
        className="h-full w-full object-contain filter drop-shadow-sm transition-transform duration-300"
        priority
      />
    </span>
  );
}

