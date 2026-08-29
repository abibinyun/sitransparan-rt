import React from 'react';
import { ScrollText, MapPin } from 'lucide-react';
import { usePublicMeetings } from '../services/public_transparency';

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Akan Datang',
  ongoing: 'Berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

/**
 * Keputusan musyawarah publik — hanya meeting visibility=public
 * (ditegakkan server-side; widget ini hanya membaca endpoint publik).
 */
export const MeetingDecisionsWidget: React.FC = () => {
  const { data: meetings, isLoading } = usePublicMeetings();

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-2xl bg-slate-100" aria-label="Memuat notulen rapat" />;
  }

  if (!meetings || meetings.length === 0) return null;

  return (
    <section aria-label="Notulen musyawarah publik" className="civic-card p-5 sm:p-6 space-y-4">
      <h2 className="flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800">
        <ScrollText className="h-4 w-4 text-emerald-600" /> Keputusan Musyawarah
      </h2>
      <ul className="divide-y divide-slate-100 space-y-1">
        {meetings.slice(0, 4).map((m) => (
          <li key={m.id} className="pt-3 first:pt-0 pb-1">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{m.title}</h3>
              <span className="shrink-0 text-[10px] font-bold text-slate-400 tabular-nums">
                {new Date(m.meeting_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            {m.agenda && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{m.agenda}</p>
            )}
            <p className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
              <MapPin className="h-3 w-3 text-rose-500" /> {m.location}
              <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                {STATUS_LABEL[m.status] ?? m.status}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};
