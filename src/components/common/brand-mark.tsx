import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

/**
 * The festival emblem on its own: the official 2026 Romansiada Uzbekistan mark.
 *
 * The source is a tall portrait image, so the wrapper sets the height and lets the
 * width follow — a square box would letterbox it and shrink the mark to fill.
 */
export function BrandMark({
  className,
  title = 'Romansiada Emblem',
}: {
  className?: string;
  /** Retained for call sites that still pass it; the mark is a raster image now. */
  gradientId?: string;
  title?: string;
}) {
  return (
    <span className={cn('relative inline-flex h-12 shrink-0 items-center justify-center', className)}>
      <Image
        src="/images/logo-2026.webp"
        alt={title}
        width={377}
        height={480}
        className="h-full w-auto object-contain filter drop-shadow-sm transition-transform duration-300"
        priority
      />
    </span>
  );
}
