import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getFileUrl } from '../utils/file';

/**
 * Carousel foto feed (Fase 2): scroll-snap native, tanpa library.
 * Gambar dari objek MinIO milik tenant (upload via pengurus).
 */
export const MediaCarousel: React.FC<{ urls: string[]; alt: string }> = ({ urls, alt }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (!urls.length) return null;

  const scrollTo = (i: number) => {
    const clamped = Math.max(0, Math.min(urls.length - 1, i));
    setIndex(clamped);
    const track = trackRef.current;
    if (track) {
      track.children[clamped]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200" role="group" aria-label={`Foto ${alt}`}>
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== index) setIndex(i);
        }}
      >
        {urls.map((url, i) => (
          <img
            key={i}
            src={getFileUrl(url)}
            alt={`${alt} - foto ${i + 1} dari ${urls.length}`}
            loading="lazy"
            className="w-full shrink-0 snap-start object-cover"
            style={{ aspectRatio: '16 / 9' }}
          />
        ))}
      </div>

      {urls.length > 1 && (
        <>
          <button
            onClick={() => scrollTo(index - 1)}
            disabled={index === 0}
            aria-label="Foto sebelumnya"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-slate-700 shadow-sm disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollTo(index + 1)}
            disabled={index === urls.length - 1}
            aria-label="Foto berikutnya"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-slate-700 shadow-sm disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {urls.map((_, i) => (
              <span
                key={i}
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-emerald-700' : 'bg-white/80'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
