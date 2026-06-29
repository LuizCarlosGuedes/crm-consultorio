'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, CalendarDays, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export interface AgendaEvento {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  colorId: string | null;
  location: string | null;
}

// Cores do Google Calendar -> semáforo da clínica
const COR: Record<string, { dot: string; chip: string; label: string }> = {
  '5':  { dot: 'bg-amber-400',   chip: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/25 dark:text-amber-100 dark:border-amber-400/60', label: 'Agendado' },
  '10': { dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/25 dark:text-emerald-100 dark:border-emerald-400/60', label: 'Confirmado' },
  '7':  { dot: 'bg-blue-500',    chip: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/30 dark:text-blue-100 dark:border-blue-400/60', label: 'Consultado' },
  '11': { dot: 'bg-red-500',     chip: 'bg-red-100 text-red-900 border-red-300 dark:bg-red-500/30 dark:text-red-100 dark:border-red-400/60', label: 'No-show' },
  '3':  { dot: 'bg-purple-500',  chip: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/30 dark:text-purple-100 dark:border-purple-400/60', label: 'Sessão' },
};
const COR_PADRAO = { dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600', label: 'Outro' };
const cor = (id: string | null) => (id && COR[id]) || COR_PADRAO;

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const horaOf = (iso: string | null) => (iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '');

export function AgendaView() {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [eventos, setEventos]   = useState<AgendaEvento[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selDia, setSelDia]     = useState<string | null>(() => keyOf(new Date()));
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // Grade de 6 semanas (42 células) começando no domingo
  const grid = useMemo(() => {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    const start = new Date(y, m, 1);
    start.setDate(1 - start.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [viewDate]);

  const fetchEventos = useCallback(async () => {
    const timeMin = new Date(grid[0]); timeMin.setHours(0, 0, 0, 0);
    const timeMax = new Date(grid[41]); timeMax.setHours(23, 59, 59, 0);
    try {
      const res = await fetch(`/api/agenda?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}`, { cache: 'no-store' });
      const data = await res.json();
      setEventos(Array.isArray(data?.eventos) ? data.eventos : []);
      setUpdatedAt(new Date());
    } catch {
      /* mantém os eventos atuais em caso de falha de rede */
    } finally {
      setLoading(false);
    }
  }, [grid]);

  // Carrega ao trocar de mês + auto-refresh a cada 30s
  useEffect(() => {
    setLoading(true);
    fetchEventos();
    const t = setInterval(fetchEventos, 30_000);
    return () => clearInterval(t);
  }, [fetchEventos]);

  // Eventos agrupados por dia (chave YYYY-MM-DD)
  const porDia = useMemo(() => {
    const map: Record<string, AgendaEvento[]> = {};
    for (const ev of eventos) {
      if (!ev.start) continue;
      const k = keyOf(new Date(ev.start));
      (map[k] ||= []).push(ev);
    }
    for (const k in map) map[k].sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    return map;
  }, [eventos]);

  const hojeKey = keyOf(new Date());
  const mesAtual = viewDate.getMonth();
  const eventosDoDia = selDia ? (porDia[selDia] ?? []) : [];

  function mudarMes(delta: number) {
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }
  function irHoje() {
    const h = new Date();
    setViewDate(new Date(h.getFullYear(), h.getMonth(), 1));
    setSelDia(keyOf(h));
  }

  return (
    <div className="p-4">
      {/* ── Barra de controle ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Agenda</h2>
          <span className="text-xs text-muted-foreground hidden sm:inline">· espelho do Google Calendar</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => mudarMes(-1)} className="p-1.5 rounded-md border border-border hover:bg-accent transition-colors" title="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[150px] text-center text-sm font-semibold">{MESES[mesAtual]} {viewDate.getFullYear()}</span>
          <button onClick={() => mudarMes(1)} className="p-1.5 rounded-md border border-border hover:bg-accent transition-colors" title="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </button>
          <Button variant="outline" size="sm" onClick={irHoje} className="h-8 text-xs ml-1">Hoje</Button>
          <button onClick={fetchEventos} className="p-1.5 rounded-md border border-border hover:bg-accent transition-colors" title="Atualizar agora">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── Legenda ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Agendado</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Confirmado</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Consultado</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> No-show</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Sessão</span>
        {updatedAt && <span className="ml-auto italic hidden sm:block">atualizado {horaOf(updatedAt.toISOString())} · auto a cada 30s</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* ── Calendário ── */}
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 hdr-navy">
            {WEEKDAYS.map(w => (
              <div key={w} className="px-2 py-2 text-center text-[11px] font-semibold text-brand-cream/80">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((d, i) => {
              const k = keyOf(d);
              const doMes = d.getMonth() === mesAtual;
              const isHoje = k === hojeKey;
              const isSel = k === selDia;
              const evs = porDia[k] ?? [];
              return (
                <button
                  key={i}
                  onClick={() => setSelDia(k)}
                  className={cn(
                    'min-h-[78px] border-b border-r border-border p-1 text-left flex flex-col gap-0.5 transition-colors hover:bg-accent/40',
                    !doMes && 'bg-muted/30 text-muted-foreground/50',
                    isSel && 'ring-2 ring-inset ring-brand-gold/70',
                  )}
                >
                  <span className={cn(
                    'text-[11px] font-medium self-end px-1 rounded',
                    isHoje && 'bg-brand-gold text-brand-navy font-bold',
                  )}>
                    {d.getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {evs.slice(0, 3).map(ev => (
                      <span key={ev.id} className={cn('text-[9px] leading-tight rounded px-1 py-0.5 border truncate', cor(ev.colorId).chip)}>
                        {!ev.allDay && <b className="font-semibold">{horaOf(ev.start)} </b>}{ev.title}
                      </span>
                    ))}
                    {evs.length > 3 && <span className="text-[9px] text-muted-foreground pl-1">+{evs.length - 3}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Detalhe do dia ── */}
        <div className="rounded-lg border border-border bg-card p-3 shadow-sm h-fit">
          <h3 className="text-sm font-semibold mb-2">
            {selDia
              ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(selDia + 'T12:00:00'))
              : 'Selecione um dia'}
          </h3>
          {eventosDoDia.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Nenhum compromisso neste dia.</p>
          ) : (
            <div className="space-y-2">
              {eventosDoDia.map(ev => {
                const c = cor(ev.colorId);
                return (
                  <div key={ev.id} className="rounded-md border border-border p-2">
                    <div className="flex items-start gap-2">
                      <span className={cn('w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0', c.dot)} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium leading-snug">{ev.title}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {ev.allDay ? 'Dia inteiro' : `${horaOf(ev.start)}${ev.end ? '–' + horaOf(ev.end) : ''}`}
                          <span className={cn('ml-1 px-1 rounded border text-[9px]', c.chip)}>{c.label}</span>
                        </p>
                        {ev.location && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-2.5 w-2.5" /> {ev.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-3 italic">
            Para criar ou mover, use o Google Calendar — a alteração reflete aqui automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
