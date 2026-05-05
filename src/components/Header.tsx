'use client';

import { Search, Plus, RefreshCw, Eye } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface HeaderProps {
  activeTab: 'crm' | 'dashboard' | 'pendencias';
  onTabChange: (tab: 'crm' | 'dashboard' | 'pendencias') => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  filterPrioridade: string;
  onFilterChange: (val: string) => void;
  showAll: boolean;
  onShowAllToggle: () => void;
  onAddLead: () => void;
  onRefresh: () => void;
  pendenciasCount?: number;
}

const FILTERS = [
  { label: 'Todos', value: 'todos' },
  { label: 'Urgente', value: 'urgente' },
  { label: 'Alta', value: 'alta' },
  { label: 'Normal', value: 'normal' },
  { label: 'Frio', value: 'frio' },
];

export function Header({
  activeTab, onTabChange,
  searchTerm, onSearchChange,
  filterPrioridade, onFilterChange,
  showAll, onShowAllToggle,
  onAddLead, onRefresh,
  pendenciasCount = 0,
}: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">CRM</span>
            </div>
            <span className="font-semibold text-sm hidden sm:block">Clínica Dr. Luiz Guedes</span>
          </div>

          {/* Main tabs */}
          <nav className="flex items-center gap-1 ml-4">
            <button
              onClick={() => onTabChange('crm')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'crm'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              CRM Pipeline
            </button>
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onTabChange('pendencias')}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'pendencias'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              Pendências
              {pendenciasCount > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1 leading-none ${
                  activeTab === 'pendencias'
                    ? 'bg-white/20 text-white'
                    : 'bg-red-500 text-white'
                }`}>
                  {pendenciasCount > 99 ? '99+' : pendenciasCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onRefresh} title="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <ThemeToggle />
          <Button onClick={onAddLead} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Lead</span>
          </Button>
        </div>
      </div>

      {/* Filter bar — only shown in CRM tab */}
      {activeTab === 'crm' && (
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
          <div className="relative flex-shrink-0 w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar nome ou telefone..."
              className="pl-8 h-8 text-xs"
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => onFilterChange(f.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  filterPrioridade === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={onShowAllToggle}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
              showAll
                ? 'bg-blue-500 text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="h-3 w-3" />
            Ver Todos no Pipeline
          </button>
        </div>
      )}
    </header>
  );
}
