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
    <div className="space-y-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-2 sm:space-x-6 overflow-x-auto">
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
                    'inline-flex items-center gap-2 py-3 px-2 sm:px-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors duration-150',
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
                  ].join(' ')
                }
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
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
