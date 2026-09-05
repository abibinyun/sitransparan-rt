import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Newspaper,
  MessageSquareHeart,
  CalendarDays,
  Sparkles,
  UserRound
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const items = [
  { to: '/', label: 'Kabar', icon: Newspaper, end: true },
  { to: '/usulan', label: 'Aspirasi', icon: MessageSquareHeart },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/program', label: 'Program', icon: Sparkles },
];

/**
 * Mobile Bottom Navigation: Ergonomis, thumb-friendly, anti AI-slop.
 */
export const PublicBottomNav: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Navigasi ponsel"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden shadow-lg"
    >
      <div className="grid grid-cols-5 items-center h-16 px-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-700 font-extrabold scale-105'
                  : 'text-slate-500 font-medium hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1 rounded-xl transition-colors ${
                    isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <span className="text-[10px] leading-none tracking-tight">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={() => navigate(user ? '/admin' : '/login')}
          className="flex flex-col items-center justify-center gap-1 py-1 rounded-xl text-slate-500 font-medium hover:text-slate-900"
        >
          <div className="p-1 rounded-xl text-slate-500">
            <UserRound className="h-5 w-5" aria-hidden />
          </div>
          <span className="text-[10px] leading-none tracking-tight">
            {user ? 'Internal' : 'Akun'}
          </span>
        </button>
      </div>
    </nav>
  );
};
