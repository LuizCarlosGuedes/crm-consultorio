'use client';

import { LayoutGrid, List, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type ViewType = 'kanban' | 'lista' | 'dashboard' | 'configuracoes';

interface SidebarProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
}

const MENU_ITEMS = [
  { id: 'kanban',        icon: LayoutGrid, label: 'Kanban' },
  { id: 'lista',         icon: List,       label: 'Lista' },
  { id: 'dashboard',     icon: BarChart3,  label: 'Dashboard' },
  { id: 'configuracoes', icon: Settings,   label: 'Configurações' },
] as const;

export function Sidebar({ view, onViewChange }: SidebarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <aside className="fixed left-0 top-[89px] bottom-0 z-30 w-12 bg-background border-r border-border flex flex-col items-center py-3 gap-1">
        {MENU_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = view === item.id;
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onViewChange(item.id as ViewType)}
                  className={cn(
                    'w-8 h-8 rounded-md flex items-center justify-center transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </aside>
    </TooltipProvider>
  );
}
