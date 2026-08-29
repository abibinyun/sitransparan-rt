import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Newspaper, MessageSquareHeart, CalendarDays, Flame, Recycle, UserRound } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const items = [
  { to: '/', label: 'Kabar', icon: Newspaper, end: true },
  { to: '/usulan', label: 'Usulan', icon: MessageSquareHeart },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/karang-taruna', label: 'Pemuda', icon: Flame },
  { to: '/bank-sampah', label: 'Sampah', icon: Recycle },
];

/** Navigasi bawah untuk portal publik di ponsel (mobile-first). */
export const PublicBottomNav: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="grid grid-cols-6">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${
                isActive ? 'text-emerald-700' : 'text-slate-500'
              }`
            }
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </NavLink>
        ))}
        <button
          onClick={() => navigate(user ? '/admin' : '/login')}
          className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold text-slate-500"
        >
          <UserRound className="h-5 w-5" aria-hidden />
          {user ? 'Internal' : 'Akun'}
        </button>
      </div>
    </nav>
  );
};
