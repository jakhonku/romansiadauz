'use client';

import { Play } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { cn } from '@/lib/utils/cn';
import type { VideoSummary } from '@/types/content';

/**
 * A YouTube video that loads only when asked.
 *
 * Until the visitor clicks, the card is a thumbnail: no iframe, no YouTube script, no
 * third-party cookie. Embedding a dozen players on the gallery page would otherwise cost
 * several megabytes and hand YouTube a tracking opportunity for visitors who never press
 * play. The click swaps in the iframe with `autoplay=1`, so it still takes one click.
 *
 * `youtube-nocookie.com` is the privacy-preserving host, and matches the `frame-src`
 * allow-list in `next.config.ts`.
 */
export function VideoCard({
  video,
  watchLabel,
  className,
}: {
  video: VideoSummary;
  watchLabel: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-card border border-border bg-card shadow-card',
        'transition-shadow duration-500 ease-luxe hover:shadow-lift',
        className,
      )}
    >
      <div className="relative aspect-video bg-muted">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group/play absolute inset-0 h-full w-full"
            aria-label={`${watchLabel}: ${video.title}`}
          >
            <Image
              src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
              alt=""
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-luxe group-hover:scale-105"
            />
            <span aria-hidden className="absolute inset-0 bg-black/25 transition-colors group-hover/play:bg-black/40" />
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary/90 text-primary-foreground shadow-lift transition-transform duration-300 ease-luxe group-hover/play:scale-110"
            >
              <Play className="size-6 translate-x-0.5 fill-current" />
            </span>
          </button>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-display text-base font-semibold leading-snug">{video.title}</h3>
        {video.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{video.description}</p>
        ) : null}
      </div>
    </article>
  );
}
