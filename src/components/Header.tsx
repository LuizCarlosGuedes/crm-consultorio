'use client';

import { Search, Plus, RefreshCw, LayoutGrid, List } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Stage } from '@/lib/types';

export type ActiveTab = 'dashboard' | 'pipeline1' | 'pipeline2' | 'pendencias' | 'retornos' | 'descadastrados';
export type ViewMode  = 'kanban' | 'lista';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  filterPrioridade: string;
  onFilterChange: (val: string) => void;
  filterEtapa: string;
  onFilterEtapaChange: (val: string) => void;
  stages: Stage[];
  onAddLead: () => void;
  onRefresh: () => void;
  pendenciasCount?: number;
}

const FILTERS = [
  { label: 'Todos',   value: 'todos'   },
  { label: 'Urgente', value: 'urgente' },
  { label: 'Alta',    value: 'alta'    },
  { label: 'Normal',  value: 'normal'  },
  { label: 'Frio',    value: 'frio'    },
];

const TABS: { id: ActiveTab; label: string }[] = [
  { id: 'dashboard',       label: 'Dashboard'       },
  { id: 'pipeline1',       label: 'Pipeline 1'      },
  { id: 'pipeline2',       label: 'Pipeline 2'      },
  { id: 'pendencias',      label: 'Pendências'      },
  { id: 'retornos',        label: 'Retornos'        },
  { id: 'descadastrados',  label: 'Descadastrados'  },
];

export function Header({
  activeTab, onTabChange,
  viewMode, onViewModeChange,
  searchTerm, onSearchChange,
  filterPrioridade, onFilterChange,
  filterEtapa, onFilterEtapaChange,
  stages,
  onAddLead, onRefresh,
  pendenciasCount = 0,
}: HeaderProps) {
  const showFilterBar = activeTab === 'pipeline1' || activeTab === 'pipeline2';

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40"
      style={{ backgroundColor: '#0b1a35' }}
    >
      {/* ── Top bar ─────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: '1px solid #3f4e68' }}
      >
        {/* Logo + Nav */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center font-black text-[10px]"
              style={{ backgroundColor: '#c2a650', color: '#0b1a35' }}
            >
              CRM
            </div>
            <span
              className="font-semibold text-sm hidden md:block whitespace-nowrap"
              style={{ color: '#f7f6f4' }}
            >
              Dr. Luiz Guedes
            </span>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-center gap-0.5 ml-2">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                  style={
                    isActive
                      ? { backgroundColor: '#c2a650', color: '#0b1a35', fontWeight: 700 }
                      : { color: '#e0e0e0' }
                  }
                  onMouseEnter={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = '#3f4e68';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  {tab.label}
                  {tab.id === 'pendencias' && pendenciasCount > 0 && (
                    <span
                      className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1 leading-none"
                      style={
                        isActive
                          ? { backgroundColor: '#0b1a35', color: '#c2a650' }
                          : { backgroundColor: '#c2a650', color: '#0b1a35' }
                      }
                    >
                      {pendenciasCount > 99 ? '99+' : pendenciasCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {/* Kanban / Lista toggle */}
          {showFilterBar && (
            <div
              className="flex items-center rounded-md overflow-hidden"
              style={{ border: '1px solid #3f4e68' }}
            >
              {(['kanban', 'lista'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => onViewModeChange(v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors capitalize"
                  style={
                    viewMode === v
                      ? { backgroundColor: '#c2a650', color: '#0b1a35', fontWeight: 700 }
                      : { color: '#e0e0e0' }
                  }
                >
                  {v === 'kanban' ? <LayoutGrid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{v === 'kanban' ? 'Kanban' : 'Lista'}</span>
                </button>
              ))}
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={onRefresh}
            title="Atualizar"
            className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
            style={{ color: '#e0e0e0' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#3f4e68'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* Theme toggle */}
          <div style={{ color: '#e0e0e0' }}>
            <ThemeToggle />
          </div>

          {/* + Novo Lead */}
          <button
            onClick={onAddLead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold transition-colors"
            style={{ backgroundColor: '#c2a650', color: '#0b1a35' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#d4b660'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#c2a650'; }}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Lead</span>
          </button>
        </div>
      </div>

      {/* ── Filter bar — apenas em pipeline tabs ─────── */}
      {showFilterBar && (
        <div
          className="flex items-center gap-2 px-4 py-2 overflow-x-auto"
          style={{ borderBottom: '1px solid #3f4e6870' }}
        >
          {/* Search */}
          <div className="relative flex-shrink-0 w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: '#e0e0e0' }} />
            <input
              type="text"
              placeholder="Buscar nome ou telefone..."
              className="w-full h-8 pl-8 pr-3 rounded-md text-xs outline-none transition-colors"
              style={{
                backgroundColor: '#3f4e6860',
                border: '1px solid #3f4e68',
                color: '#f7f6f4',
              }}
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
            />
          </div>

          {/* Filtro por etapa */}
          <select
            value={filterEtapa}
            onChange={e => onFilterEtapaChange(e.target.value)}
            className="h-8 rounded-md text-xs outline-none flex-shrink-0 px-2 pr-6 appearance-none cursor-pointer"
            style={{
              backgroundColor: filterEtapa !== 'todas' ? '#c2a650' : '#3f4e6860',
              border: '1px solid #3f4e68',
              color: filterEtapa !== 'todas' ? '#0b1a35' : '#f7f6f4',
              fontWeight: filterEtapa !== 'todas' ? 700 : 400,
              minWidth: '140px',
            }}
          >
            <option value="todas" style={{ backgroundColor: '#0b1a35', color: '#f7f6f4' }}>
              Todas as etapas
            </option>
            {stages.map(s => (
              <option key={s.id} value={s.id} style={{ backgroundColor: '#0b1a35', color: '#f7f6f4' }}>
                {s.nome}
              </option>
            ))}
          </select>

          {/* Priority filters */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {FILTERS.map(f => {
              const isActive = filterPrioridade === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => onFilterChange(f.value)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
                  style={
                    isActive
                      ? { backgroundColor: '#c2a650', color: '#0b1a35', fontWeight: 700 }
                      : { backgroundColor: '#3f4e6850', color: '#e0e0e0' }
                  }
                >
                  {f.label}
                </button>
              );
            })}
          </div>

        </div>
      )}
    </header>
  );
}
