'use client';

import { useState } from 'react';
import {
  LayoutDashboard, Columns3, GitBranch, Stethoscope, CalendarDays,
  Megaphone, ClipboardList, Repeat, Flame, UserX, Sparkles,
} from 'lucide-react';
import { TarefaNathaliaModal } from './TarefaNathaliaModal';
import { ThemeToggle } from './ThemeToggle';
import { ActiveTab, TABS } from './Header';

const ICONS: Record<ActiveTab, React.ComponentType<{ className?: string }>> = {
  dashboard:      LayoutDashboard,
  pipeline1:      Columns3,
  pipeline2:      GitBranch,
  procedimentos:  Stethoscope,
  agenda:         CalendarDays,
  conteudo:       Megaphone,
  pendencias:     ClipboardList,
  retornos:       Repeat,
  reativacao:     Flame,
  descadastrados: UserX,
};

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  pendenciasCount?: number;
}

// Largura recolhida (só ícones). No hover expande para 212px SOBREPONDO o conteúdo
// (não empurra o kanban). É fixo, então não se mexe quando o kanban rola na horizontal.
export const SIDEBAR_W = 60;

// Logo da Clínica Luiz Guedes — monograma "LG" branco, fundo transparente, embutido
// como data-URI (não depende de public/, que o Dockerfile não serve no runtime).
const LG_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAEBUlEQVR4nO2dPWhUQRDH/3OXCGIZW0HB3g8QbK0E7QQ/KsEUYiGKjY1RUEE7C4PgB9gJBsSvQlFEQWzsUgmms9fOFGpyf5m7WXycXnImgZm9zA8eD3Ipdt9vZ3cf7MwDyYckdwMAyTEEgmTL7pPssUCyw/pZtPusdnAXgNck94uIdrBNUhAAEdGH3RKR+wDOAGirD7tGAhXwHcAEgJckz4nIYnP0BZEwJiLTAE5bm0dGQqtvVN0geQfABuu4/uaO9CJTJdyySNB2d0ZBQhnlYp3R0X/SomGLRkNACdN901ERUeXVnGbEOrUAYB+A9yT3mgQJKOGsDSC9pLKrbffxf+16xiwStgJ4S/K4iDyyxVBHWxQJN21gTNloCrFmDUnH2vtVdCsEYEfjj4WfuhYAeCEiB6MIKJT2kNyEeukste8vuw3dJYVD/mxR51Exy714SeTQlp6EEOvTSgn15rsSRKTqrWjY0b1eSAHOpABnUoAzKcCZFOBMCnAmBTiTApxJAc6kAGdSgDMpwJkU4EwKcCYFOJMCnEkBzqQAZ1KAMynAmRTgTApwJgU4kwKcSQHOpABnUoAzKcCZFOBMCnAmBTiTApypIkOGvaz9qlORBhCrOMcgImVnrjVVCCC5x1JmMSKRQOvHfGgBJNtWPGQngLsYPeZCC5BemQTNBb5HcjOAawB+WOTWHAklKT52BBi00gTXSW4HMGn1LEIUEVkF3ToXrUrygBdtJ3QKwBuLAJVQPeEFNJOxReQXgGMAPjWKilRNDVNQl1JASkS+kTwE4AOAzSZBah3o1QhoLMq6HnwmeQTAK625g4qpSkBfvaB3JE8AuGBREHE61alzI4Btg6K0OgENCbo9fUByJmjtuFLXTt9hPjZKrEn1AvrqBYXcDWl9U908aK3Tpf6vWgEV1AtqqYTlpsaqBUSuF6RD3yJgyfZFXLjWFSnAmRTgTApwJgU4kwKcSQHOpABnUoAzKcCZFOBMCnAmBTiTApxJAc6kAGdSgDMpwJkU4EwKcCYFOJMCnEkBzqQAZ1KAMynAmRTgzFBnQ+0ArEQ8CCtBz4aupYDuIdOo+VgM9p3jAXQGZXUOI2DcPppcEg5CISLzJTKDRkP30+X27OR/BJTfDgD4gnh07Az+bRGZ0gS+khSBGOjJdB20cwAeA9DEwoW/nrl+0rx7iJ3UBLhauWp9aUdap0pbSOos8sTa+qvxrGeH3QUx6NWxUaURcNXqSrSiSLAEDbH85qMAnvYnmQ8rQIJeLVvcioQrQSVoO4uE51b5pTMq7wHSkHCR5GWTEEKAYrs0MQmHATyzZ78wCgKaEvTBX7JI6GZRIpgEEfkJoCSZT4RpIFZPmZJKJJyPKMHeW1SCRsLMbyDZm5oVzz8ZAAAAAElFTkSuQmCC';

export function Sidebar({ activeTab, onTabChange, pendenciasCount = 0 }: SidebarProps) {
  const [tarefaOpen, setTarefaOpen] = useState(false);

  return (
    <>
      <aside
        className="group fixed left-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden transition-[width] duration-200"
        style={{
          width: SIDEBAR_W,
          background: 'linear-gradient(180deg, #0e2247 0%, #0a1830 100%)',
          borderRight: '1px solid #3f4e68',
          boxShadow: '6px 0 24px -12px rgba(0,0,0,0.55)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.width = '212px'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.width = `${SIDEBAR_W}px`; }}
      >
        {/* Logo */}
        <div
          className="flex items-center h-[53px] flex-shrink-0"
          style={{ borderBottom: '1px solid #3f4e68' }}
        >
          <div className="flex items-center justify-center flex-shrink-0" style={{ width: SIDEBAR_W }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LG_LOGO} alt="Clínica Luiz Guedes" style={{ height: 30, width: 'auto' }} />
          </div>
          <div className="flex flex-col justify-center leading-tight whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-sm font-medium" style={{ color: '#f7f6f4', letterSpacing: '0.4px' }}>Luiz Guedes</span>
            <span className="text-[10px] font-medium" style={{ color: '#8595b5', letterSpacing: '0.28em' }}>CLÍNICA</span>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 py-1.5 overflow-y-auto overflow-x-hidden">
          {TABS.map(tab => {
            const Icon = ICONS[tab.id];
            const isActive = activeTab === tab.id;
            const showBadge = tab.id === 'pendencias' && pendenciasCount > 0;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                title={tab.label}
                className="relative flex items-center gap-3 w-full h-[44px] px-[18px] text-sm font-medium transition-colors"
                style={isActive
                  ? { backgroundColor: '#c2a650', color: '#0b1a35', fontWeight: 700 }
                  : { color: '#cdd7ee' }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = '#2a3650'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {tab.label}
                </span>
                {showBadge && (
                  <span
                    className="absolute inline-flex items-center justify-center min-w-[17px] h-[17px] rounded-full text-[10px] font-bold px-1 leading-none"
                    style={{
                      top: 7, right: 11,
                      backgroundColor: isActive ? '#0b1a35' : '#c2a650',
                      color: isActive ? '#c2a650' : '#0b1a35',
                    }}
                  >
                    {pendenciasCount > 99 ? '99+' : pendenciasCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Rodapé: Contato IA + Tema */}
        <div className="flex-shrink-0 py-1.5" style={{ borderTop: '1px solid #3f4e68' }}>
          <button
            onClick={() => setTarefaOpen(true)}
            title="Contato IA — mandar a Nathalia falar com um paciente"
            className="flex items-center gap-3 w-full h-[44px] px-[18px] text-sm font-medium transition-colors"
            style={{ color: '#cdd7ee' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#2a3650'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <Sparkles className="h-5 w-5 flex-shrink-0" />
            <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              Contato IA
            </span>
          </button>
          <div className="flex items-center gap-3 h-[44px] px-[15px]" style={{ color: '#cdd7ee' }}>
            <div className="flex items-center justify-center w-[26px] flex-shrink-0">
              <ThemeToggle />
            </div>
            <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
              Tema
            </span>
          </div>
        </div>
      </aside>

      {tarefaOpen && <TarefaNathaliaModal onClose={() => setTarefaOpen(false)} />}
    </>
  );
}
