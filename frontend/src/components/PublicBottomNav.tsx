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
import { prefetchRoute } from '../utils/routePrefetch';

const items = [
  { to: '/', label: 'Kabar', icon: Newspaper, end: true },
  { to: '/usulan', label: 'Aspirasi', icon: MessageSquareHeart },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/program', label: 'Program', icon: Sparkles },
];

/**
 * Mobile Bottom Navigation: Clean, thumb-friendly enterprise dock.
 */
export const PublicBottomNav: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Navigasi ponsel"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#d2d2d7] bg-white/90 backdrop-blur-2xl pb-[env(safe-area-inset-bottom)] md:hidden shadow-sm"
    >
      <div className="grid grid-cols-5 items-center h-16 px-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onMouseEnter={() => prefetchRoute(to)}
            onTouchStart={() => prefetchRoute(to)}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all ${
                isActive
                  ? 'text-[#0071e3] font-semibold'
                  : 'text-[#707070] hover:text-[#1d1d1f]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1.5 rounded-full transition-colors ${
                    isActive ? 'bg-[#f4f8fb] text-[#0071e3] ring-1 ring-[#d2d2d7]' : 'text-[#707070]'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden />
                </div>
                <span className="text-[10px] tracking-tight">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={() => navigate(user ? '/admin' : '/login')}
          onMouseEnter={() => prefetchRoute(user ? '/admin' : '/login')}
          onTouchStart={() => prefetchRoute(user ? '/admin' : '/login')}
          className="flex flex-col items-center justify-center gap-1 py-1 rounded-xl text-[#707070] hover:text-[#1d1d1f] transition-colors"
          aria-label={user ? 'Buka panel pengurus' : 'Masuk akun'}
        >
          <div className="p-1.5 rounded-full text-[#707070] hover:bg-[#f5f5f7] transition-colors">
            <UserRound className="h-4.5 w-4.5" aria-hidden />
          </div>
          <span className="text-[10px] tracking-tight">
            {user ? 'Panel' : 'Akun'}
          </span>
        </button>
      </div>
    </nav>
  );
};
