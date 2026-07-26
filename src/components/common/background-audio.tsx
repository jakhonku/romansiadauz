'use client';

import { useEffect, useRef, useState } from 'react';

import { Volume2, VolumeX } from 'lucide-react';

/**
 * BackgroundAudio — loads and plays the festival theme on first user interaction.
 *
 * Browsers block autoplay with sound until the user interacts with the page.
 * This component waits for the first click/keypress/scroll anywhere on the page,
 * then plays the audio softly. A small floating button lets the visitor mute/unmute.
 */
export function BackgroundAudio({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.18;
    // `'none'`, not `'auto'`. The theme is ~2.6 MB and this component mounts on every
    // page, so `'auto'` downloaded it in full for every visitor on every navigation —
    // including the many who never interact, and the majority who are on mobile data.
    // Loading starts on the first `play()` instead, which costs a short delay before
    // the music fades in and nothing at all for everyone else.
    audio.preload = 'none';
    audioRef.current = audio;

    const start = () => {
      if (started.current) return;
      started.current = true;
      audio.play().then(() => {
        setPlaying(true);
        setVisible(true);
      }).catch(() => {
        // autoplay blocked even after interaction — show button silently
        setVisible(true);
      });
    };

    window.addEventListener('click', start, { once: true });
    window.addEventListener('keydown', start, { once: true });
    window.addEventListener('scroll', start, { once: true, passive: true });

    return () => {
      window.removeEventListener('click', start);
      window.removeEventListener('keydown', start);
      window.removeEventListener('scroll', start);
      audio.pause();
      audio.src = '';
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!started.current) {
      started.current = true;
      audio.play().then(() => setPlaying(true)).catch(() => {});
    } else if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  if (!visible) return null;

  return (
    <button
      onClick={toggle}
      aria-label={playing ? 'Musiqani o\'chirish' : 'Musiqani yoqish'}
      title={playing ? 'Musiqani o\'chirish' : 'Musiqani yoqish'}
      className="
        fixed bottom-6 right-6 z-50
        grid size-11 place-items-center
        rounded-full border border-gold/40
        bg-background/80 shadow-lg shadow-black/20
        backdrop-blur-md
        text-gold
        transition-all duration-300
        hover:scale-110 hover:border-gold/70 hover:bg-background/95
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60
        sm:size-12
      "
    >
      {playing
        ? <Volume2 className="size-4 sm:size-5" />
        : <VolumeX className="size-4 sm:size-5" />
      }
      {/* Pulsing ring when playing */}
      {playing && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border border-gold/30 animate-ping"
        />
      )}
    </button>
  );
}
