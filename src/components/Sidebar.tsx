'use client';

import { LayoutGrid, List, BarChart3, Settings, ClipboardList, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type ViewType = 'kanban' | 'lista' | 'dashboard' | 'configuracoes' | 'pendencias' | 'retornos';

interface SidebarProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  topOffset: number;
  pendenciasCount?: number;
}

const MENU_ITEMS = [
  { id: 'kanban',       icon: LayoutGrid,    label: 'Kanban' },
  { id: 'lista',        icon: List,          label: 'Lista' },
  { id: 'dashboard',    icon: BarChart3,     label: 'Dashboard' },
  { id: 'pendencias',   icon: ClipboardList, label: 'Pendências' },
  { id: 'retornos',     icon: RotateCcw,     label: 'Retornos' },
  { id: 'configuracoes',icon: Settings,      label: 'Configurações' },
] as const;

export function Sidebar({ view, onViewChange, topOffset, pendenciasCount = 0 }: SidebarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className="fixed left-0 bottom-0 z-30 w-12 bg-background border-r border-border flex flex-col items-center py-3 gap-1"
        style={{ top: `${topOffset}px` }}
      >
        {MENU_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = view === item.id;
          const showBadge = item.id === 'pendencias' && pendenciasCount > 0;

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onViewChange(item.id as ViewType)}
                  className={cn(
                    'relative w-8 h-8 rounded-md flex items-center justify-center transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 bg-red-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center px-0.5 leading-none pointer-events-none">
                      {pendenciasCount > 99 ? '99+' : pendenciasCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.label}{showBadge ? ` (${pendenciasCount})` : ''}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </aside>
    </TooltipProvider>
  );
}
