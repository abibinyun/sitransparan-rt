import React from 'react';
import { NavLink } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { prefetchRoute } from '../../utils/routePrefetch';

export interface PageTabItem {
  to: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
}

interface PageHeaderTabsProps {
  title: string;
  description?: string;
  tabs: PageTabItem[];
  actions?: React.ReactNode;
}

export const PageHeaderTabs: React.FC<PageHeaderTabsProps> = ({
  title,
  description,
  tabs,
  actions,
}) => {
  return (
    <div className="space-y-3 mb-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#1d1d1f]">{title}</h1>
          {description && <p className="text-xs sm:text-sm text-[#707070] mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div className="border-b border-[#d2d2d7]">
        <nav className="-mb-px flex space-x-1 sm:space-x-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                onMouseEnter={() => prefetchRoute(tab.to)}
                onFocus={() => prefetchRoute(tab.to)}
                className={({ isActive }) =>
                  [
                    'inline-flex items-center gap-1.5 py-2.5 px-2 sm:px-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors duration-150',
                    isActive
                      ? 'border-[#0071e3] text-[#0066cc] font-semibold'
                      : 'border-transparent text-[#707070] hover:text-[#1d1d1f] hover:border-[#858585]',
                  ].join(' ')
                }
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="ml-1 rounded-full bg-[#f4f8fb] border border-[#d2d2d7] px-1.5 py-0.2 text-[10px] font-semibold text-[#0066cc]">
                    {tab.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
