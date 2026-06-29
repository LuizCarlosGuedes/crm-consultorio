'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { subWeeks, startOfWeek, format, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Users, CalendarCheck, CalendarX2, HeartPulse, DollarSign, TrendingUp,
  Repeat2, Moon, Flame, Filter, Megaphone, MessageSquare, CalendarDays, Wallet,
  Smile, Gift, RotateCcw, Stethoscope, AlertTriangle, Sparkles, Clock, TrendingDown, Target, Activity, Star,
} from 'lucide-react';
import { Lead } from '@/lib/types';
import { formatarMoeda, cn } from '@/lib/utils';

interface DashboardProps { leads: Lead[]; }

/* ── Campanha de mídia (tráfego pago) ── */
interface MidiaCamp {
  tipo: string; origem: string; campanha: string; objetivo: string | null;
  gasto: number; impressoes: number; cliques: number; reach: number;
  thruplay: number; video_3s: number; video_p50: number;
  res_leads: number; res_conversas: number; res_compras: number; valor_conversao: number;
  impression_share: number; lost_is_budget: number; lost_is_rank: number;
}

/* ── Dado real vindo do N8N (clinica_ia) ── */
interface RealData {
  pacientes_total: number; pacientes_inativos_90d: number; pacientes_com_proc: number;
  aniversariantes_mes: number; retornos_previstos: number;
  consultas_total: number; consultas_agendadas: number; consultas_realizadas: number;
  consultas_no_show: number; consultas_canceladas: number; consultas_retorno: number;
  procedimentos_agendados: number; procedimentos_realizados: number; atendimentos_realizados: number;
  receita_prevista: number; pacientes_pagantes: number;
  faturamento_total: number; faturamento_mes: number;
  fat_por_metodo: { metodo: string; valor: number }[];
  fat_por_tipo: { tipo: string; valor: number }[];
  canais: { canal: string; n: number }[];
  nichos: { nicho: string; n: number }[];
  retornos_pendentes: number;
  motivos_perda: { motivo: string; n: number }[];
  perdidos_silencio: number;
  perdidos_total: number;
  chatwoot?: {
    conversas_periodo: number; msgs_recebidas: number; msgs_enviadas: number;
    tempo_primeira_resposta_s: number; tempo_resposta_s: number; tempo_resolucao_s: number;
    conversas_abertas: number; conversas_aguardando: number; conversas_sem_dono: number;
    resolucoes_n?: number;
  };
  roi_gasto_total: number;
  roi_campanhas: { origem: string; campanha: string; gasto: number; cliques: number; leads: number; pacientes: number }[];
  midia: MidiaCamp[];
  nps?: { n: number; media: number; promotores: number; neutros: number; detratores: number; score: number };
  google_reviews?: {
    rating: number; total: number; maps_uri: string; updated_at?: string;
    reviews: { autor: string; foto: string; url: string; nota: number; quando: string; texto: string; publicado_em?: string }[];
  };
}

function fmtDur(s?: number): string {
  if (s == null || s <= 0) return '—';
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}min`;
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return m ? `${h}h ${m}min` : `${h}h`;
}

/* ── Paleta da marca ── */
const C = { navy: '#0b1a35', gold: '#c2a650', slate: '#3f4e68', emerald: '#10B981', rose: '#F43F5E', amber: '#F59E0B', cyan: '#06B6D4', violet: '#8B5CF6' };

const ATTENDED = new Set(['Compareceu', 'Pós Consulta', 'Agendamento de Retorno', 'Retorno Agendado', 'Recorrente']);
const BOOKED   = new Set(['Sinal Pago', 'Agendado']);
const QUALIF   = new Set(['Qualificado', 'Proposta Enviada']);
const DORMANT  = new Set(['Perdido', 'Reativação', 'Nutrição', 'Follow-up']);

const PERDA_LABEL: Record<string, string> = {
  preco: 'Preço / orçamento', localizacao: 'Localização / distância', convenio: 'Queria convênio',
  agenda: 'Agenda / horário', concorrente: 'Foi p/ concorrente', desistiu: 'Desistiu / mudou de ideia', outro: 'Outro motivo',
};

/* ── Componentes premium ── */
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'rounded-2xl border border-white/60 dark:border-[#c2a650]/15 bg-card',
      className,
    )}>{children}</div>
  );
}

function Kpi({ icon: Icon, label, value, sub, grad }: {
  icon: React.ElementType; label: string; value: string; sub?: string; grad: [string, string];
}) {
  return (
    <Card className="p-4 relative overflow-hidden">
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${grad[1]}, transparent 70%)` }} />
      <div className="flex items-start gap-3 relative">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-[#6b7280] dark:text-[#94a3b8] uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-bold mt-0.5 text-[#0b1a35] dark:text-white leading-none">{value}</p>
          {sub && <p className="text-[11px] text-[#6b7280] dark:text-[#94a3b8] mt-1">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

function Donut({ value, label, color, sub }: { value: number; label: string; color: string; sub?: string }) {
  const size = 132, sw = 14, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const gid = 'dg-' + label.replace(/\W/g, '');
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.55" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={sw} className="stroke-[#ece9e2] dark:stroke-[#1a2740]" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={sw} stroke={`url(#${gid})`} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)}
            style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 7px ${color}66)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[#0b1a35] dark:text-white tracking-tight">{Math.round(v)}%</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-[#0b1a35] dark:text-white">{label}</p>
      {sub && <p className="text-[10px] text-[#6b7280] dark:text-[#94a3b8] text-center max-w-[150px]">{sub}</p>}
    </div>
  );
}

function Bars({ data, color }: { data: { label: string; n: number }[]; color: string }) {
  const max = Math.max(1, ...data.map(d => d.n));
  return (
    <div className="space-y-2.5">
      {data.map(d => (
        <div key={d.label} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#0b1a35] dark:text-white truncate">{d.label}</span>
            <span className="text-[#6b7280] dark:text-[#94a3b8] font-mono">{d.n}</span>
          </div>
          <div className="h-2 rounded-full bg-[#eceae4] dark:bg-[#22304c] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(d.n / max) * 100}%`, backgroundColor: color }} />
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="text-xs text-[#6b7280] text-center py-4">Sem dados</p>}
    </div>
  );
}

function Section({ title, icon: Icon, children, right, className }: { title: string; icon?: React.ElementType; children: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#0b1a35] dark:text-white flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" style={{ color: C.gold }} />}{title}
        </h3>
        {right}
      </div>
      {children}
    </Card>
  );
}

function Soon({ items }: { items: string[] }) {
  return (
    <div className="rounded-xl border border-dashed border-[#d8d4cb] dark:border-[#2c3c58] p-4 bg-[#faf9f6] dark:bg-[#0b1a35]/40">
      <p className="text-xs font-semibold text-[#c2a650] flex items-center gap-1.5 mb-2"><Sparkles className="h-3.5 w-3.5" />Em breve (precisa coletar o dado)</p>
      <ul className="space-y-1">
        {items.map(i => <li key={i} className="text-[11px] text-[#6b7280] dark:text-[#94a3b8] flex gap-1.5"><span>•</span>{i}</li>)}
      </ul>
    </div>
  );
}

function Stars({ n, size = 16 }: { n: number; size?: number }) {
  const full = Math.round(n || 0);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} strokeWidth={1.5} style={{ width: size, height: size, color: C.gold, fill: i <= full ? C.gold : 'transparent' }} />
      ))}
    </span>
  );
}

const mNum = (n: number) => (n || 0).toLocaleString('pt-BR');
const mDiv = (a: number, b: number) => (b ? a / b : 0);
const mPct = (frac: number) => (frac > 0 ? (frac * 100).toFixed(1).replace('.', ',') + '%' : '—');

function MidiaTable({ rows, cols }: { rows: MidiaCamp[]; cols: { h: string; f: (c: MidiaCamp) => string }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs whitespace-nowrap">
        <thead>
          <tr className="text-left text-[#6b7280] dark:text-[#94a3b8] border-b border-[#eceae4] dark:border-[#22304c]">
            {cols.map((c, i) => <th key={c.h} className={cn('py-2 font-semibold', i > 0 && 'text-right pl-3')}>{c.h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-[#f2f0ea] dark:border-[#1a2740]">
              {cols.map((c, ci) => (
                <td key={c.h} className={cn('py-2', ci === 0 ? 'font-medium text-[#0b1a35] dark:text-white' : 'text-right font-mono pl-3')}>{c.f(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PERIODOS = [
  { id: 'tudo', label: 'Tudo' },
  { id: 'mes', label: 'Este mês' },
  { id: 'mes_passado', label: 'Mês passado' },
  { id: '30d', label: '30 dias' },
  { id: 'ano', label: 'Este ano' },
];
function periodoRange(p: string): { since: string; until: string } | null {
  const now = new Date();
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (p === 'mes') return { since: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), until: fmt(now) };
  if (p === 'mes_passado') return { since: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)), until: fmt(new Date(now.getFullYear(), now.getMonth(), 0)) };
  if (p === '30d') { const s = new Date(now); s.setDate(s.getDate() - 30); return { since: fmt(s), until: fmt(now) }; }
  if (p === 'ano') return { since: fmt(new Date(now.getFullYear(), 0, 1)), until: fmt(now) };
  return null; // tudo
}

const MIDIA_TIPOS = [
  { id: 'distribuicao', label: 'Distribuição', sub: 'Meta — alcance & conteúdo' },
  { id: 'conversao', label: 'Conversão', sub: 'Meta — resultado' },
  { id: 'search', label: 'Search', sub: 'Google — intenção' },
];

const TABS = [
  { id: 'geral', label: 'Visão Geral', icon: TrendingUp },
  { id: 'funil', label: 'Funil', icon: Filter },
  { id: 'canais', label: 'Canais', icon: Megaphone },
  { id: 'roi', label: 'ROI', icon: Target },
  { id: 'midia', label: 'Mídia', icon: Activity },
  { id: 'whats', label: 'Atendimento', icon: MessageSquare },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'pacientes', label: 'Pacientes', icon: HeartPulse },
  { id: 'financeiro', label: 'Financeiro', icon: Wallet },
  { id: 'experiencia', label: 'Experiência', icon: Smile },
];

const tooltipStyle = { backgroundColor: '#0b1a35', border: '1px solid #3f4e68', borderRadius: '10px', fontSize: '12px', color: '#fff' };

export function Dashboard({ leads }: DashboardProps) {
  const [tab, setTab] = useState('geral');
  const [midiaTipo, setMidiaTipo] = useState('distribuicao');
  const [periodo, setPeriodo] = useState('tudo');
  const [r, setR] = useState<RealData | null>(null);
  const [loadingR, setLoadingR] = useState(true);
  const now = new Date();

  useEffect(() => {
    let on = true;
    setLoadingR(true);
    (async () => {
      const rg = periodoRange(periodo);
      const qs = rg ? `?since=${rg.since}&until=${rg.until}` : '';
      try {
        const res = await fetch(`/api/dashboard${qs}`, { cache: 'no-store' });
        const d = await res.json();
        if (on && d && !d.erro) setR(d);
      } catch { /* silencioso */ } finally { if (on) setLoadingR(false); }
    })();
    return () => { on = false; };
  }, [periodo]);

  /* Métricas do kanban (Supabase leads) */
  const L = useMemo(() => {
    const total = leads.length;
    const attended = leads.filter(l => ATTENDED.has(l.etapa_atual)).length;
    const booked = leads.filter(l => BOOKED.has(l.etapa_atual)).length;
    const dormentes = leads.filter(l => DORMANT.has(l.etapa_atual)).length;
    const quentes = leads.filter(l => l.prioridade === 'urgente' || l.prioridade === 'alta').length;
    const leadsMes = leads.filter(l => l.data_entrada && new Date(l.data_entrada).getMonth() === now.getMonth() && new Date(l.data_entrada).getFullYear() === now.getFullYear()).length;
    return { total, attended, booked, dormentes, quentes, leadsMes };
  }, [leads]);

  const leadsPorSemana = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const ws = startOfWeek(subWeeks(now, 7 - i), { locale: ptBR });
    const we = startOfWeek(subWeeks(now, 6 - i), { locale: ptBR });
    return { semana: format(ws, 'dd/MM', { locale: ptBR }), leads: leads.filter(l => { const d = new Date(l.data_entrada); return isAfter(d, ws) && isBefore(d, we); }).length };
  }), [leads]);

  const funil = useMemo(() => {
    const cnt = (p: (l: Lead) => boolean) => leads.filter(p).length;
    const t = leads.length;
    const steps = [
      { etapa: 'Leads', v: t },
      { etapa: 'Qualificados', v: cnt(l => QUALIF.has(l.etapa_atual) || BOOKED.has(l.etapa_atual) || ATTENDED.has(l.etapa_atual)) },
      { etapa: 'Agendaram', v: cnt(l => BOOKED.has(l.etapa_atual) || ATTENDED.has(l.etapa_atual)) },
      { etapa: 'Compareceram', v: cnt(l => ATTENDED.has(l.etapa_atual)) },
      { etapa: 'Recorrentes', v: cnt(l => l.etapa_atual === 'Recorrente') },
    ];
    return steps.map((s, i) => ({ ...s, pct: i === 0 ? 100 : (steps[0].v > 0 ? Math.round((s.v / steps[0].v) * 100) : 0) }));
  }, [leads]);

  const origensLead = useMemo(() => {
    const m: Record<string, number> = {};
    leads.forEach(l => { const o = l.origem || 'Outro'; m[o] = (m[o] || 0) + 1; });
    return Object.entries(m).map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
  }, [leads]);

  const motivosPerda = useMemo(() => {
    const base = (r?.motivos_perda ?? []).map(m => ({ label: PERDA_LABEL[m.motivo] ?? m.motivo, n: m.n }));
    if (r?.perdidos_silencio) base.push({ label: 'Silêncio (sem retorno)', n: r.perdidos_silencio });
    return base.sort((a, b) => b.n - a.n);
  }, [r]);

  // derivados do dado real
  const taxaComparecimento = r ? (r.consultas_realizadas + r.consultas_no_show > 0 ? (r.consultas_realizadas / (r.consultas_realizadas + r.consultas_no_show)) * 100 : 0) : 0;
  const taxaCancel = r ? (r.consultas_total > 0 ? (r.consultas_canceladas / r.consultas_total) * 100 : 0) : 0;
  const ticket = r ? (r.pacientes_pagantes > 0 ? r.faturamento_total / r.pacientes_pagantes : 0) : 0;
  const cw = r?.chatwoot;
  const periodoLabel = PERIODOS.find(pp => pp.id === periodo)?.label ?? 'Tudo';
  const roiCampanhas = r?.roi_campanhas ?? [];
  const roiLeads = roiCampanhas.reduce((a, c) => a + (c.leads || 0), 0);
  const roiPac = roiCampanhas.reduce((a, c) => a + (c.pacientes || 0), 0);
  const midiaRows = (r?.midia ?? []).filter(m => m.tipo === midiaTipo);
  const mt = midiaRows.reduce((a, c) => ({
    gasto: a.gasto + (c.gasto || 0), impressoes: a.impressoes + (c.impressoes || 0), cliques: a.cliques + (c.cliques || 0),
    reach: a.reach + (c.reach || 0), res_leads: a.res_leads + (c.res_leads || 0), valor: a.valor + (c.valor_conversao || 0),
  }), { gasto: 0, impressoes: 0, cliques: 0, reach: 0, res_leads: 0, valor: 0 });

  return (
    <div className="space-y-5 pb-10">
      {/* Header + abas */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 flex-wrap p-1 rounded-xl bg-[#f2f0ea] dark:bg-[#0b1a35]/60">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                tab === t.id ? 'bg-white dark:bg-[#1a2c4d] text-[#0b1a35] dark:text-white shadow-sm' : 'text-[#6b7280] dark:text-[#94a3b8] hover:text-[#0b1a35] dark:hover:text-white')}>
              <t.icon className="h-3.5 w-3.5" />{t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {loadingR && <span className="text-[11px] text-[#6b7280] flex items-center gap-1.5"><Clock className="h-3 w-3 animate-spin" />carregando…</span>}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#f2f0ea] dark:bg-[#0b1a35]/60" title="Filtra faturamento, consultas, ROI, mídia e NPS pelo período. Base de pacientes e canais não mudam.">
            <Clock className="h-3.5 w-3.5 text-[#6b7280] dark:text-[#94a3b8] ml-1" />
            {PERIODOS.map(pp => (
              <button key={pp.id} onClick={() => setPeriodo(pp.id)}
                className={cn('px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all',
                  periodo === pp.id ? 'bg-white dark:bg-[#1a2c4d] text-[#0b1a35] dark:text-white shadow-sm' : 'text-[#6b7280] dark:text-[#94a3b8] hover:text-[#0b1a35] dark:hover:text-white')}>
                {pp.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ───── VISÃO GERAL ───── */}
      {tab === 'geral' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Kpi icon={Users} label="Base de pacientes" value={r ? String(r.pacientes_total) : '—'} sub={`${L.leadsMes} leads novos no mês`} grad={[C.navy, C.slate]} />
            <Kpi icon={DollarSign} label="Faturamento" value={r ? formatarMoeda(r.faturamento_total) : '—'} sub={periodo === 'tudo' ? 'total' : periodoLabel} grad={['#0e7a4f', C.emerald]} />
            <Kpi icon={HeartPulse} label="Consultas realizadas" value={r ? String(r.consultas_realizadas) : '—'} sub={r ? `${r.consultas_agendadas} agendadas` : ''} grad={['#0e6b80', C.cyan]} />
            <Kpi icon={TrendingUp} label="Ticket médio" value={formatarMoeda(ticket)} grad={['#9a7d2f', C.gold]} />
            <Kpi icon={CalendarX2} label="Canceladas" value={r ? String(r.consultas_canceladas) : '—'} sub={r ? `${r.consultas_no_show} no-show` : ''} grad={['#b3263f', C.rose]} />
            <Kpi icon={Repeat2} label="Retornos" value={r ? String(r.consultas_retorno) : '—'} sub={`${L.quentes} leads quentes`} grad={['#6d3fb3', C.violet]} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Section title="Saúde da operação" icon={Sparkles} >
              <div className="flex items-center justify-around flex-wrap gap-3">
                <Donut value={taxaComparecimento} label="Comparecimento" color={C.emerald} sub="realizadas / (real + no-show)" />
                <Donut value={taxaCancel} label="Cancelamento" color={C.rose} sub="% das consultas" />
              </div>
            </Section>
            <Section title="Novos leads por semana" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={leadsPorSemana}>
                  <defs>
                    <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#dcc174" />
                      <stop offset="100%" stopColor="#c2a650" stopOpacity="0.45" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-[#eceae4] dark:stroke-[#22304c]" />
                  <XAxis dataKey="semana" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: '#c2a65015' }} />
                  <Bar dataKey="leads" name="Leads" fill="url(#barGold)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
          </div>
        </div>
      )}

      {/* ───── FUNIL ───── */}
      {tab === 'funil' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Funil de conversão (kanban)" icon={Filter}>
            <div className="space-y-3">
              {funil.map((s, i) => {
                const drop = i > 0 && funil[i - 1].v > 0 ? Math.round((1 - s.v / funil[i - 1].v) * 100) : 0;
                return (
                  <div key={s.etapa} className="flex items-center gap-3">
                    <span className="text-xs w-28 font-semibold text-[#0b1a35] dark:text-white">{s.etapa}</span>
                    <div className="flex-1 h-7 rounded-lg bg-[#eceae4] dark:bg-[#22304c] overflow-hidden">
                      <div className="h-full rounded-lg flex items-center px-2.5 transition-all duration-500" style={{ width: `${Math.max(s.pct, 6)}%`, background: i === funil.length - 1 ? `linear-gradient(90deg,#0e7a4f,${C.emerald})` : `linear-gradient(90deg,${C.navy},${C.slate})` }}>
                        <span className="text-[11px] font-bold text-white">{s.v}</span>
                      </div>
                    </div>
                    <span className="text-xs w-10 text-right font-mono text-[#6b7280] dark:text-[#94a3b8]">{s.pct}%</span>
                    <span className="text-[10px] w-12 text-right text-rose-500">{i > 0 && drop > 0 ? `-${drop}%` : ''}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-[#6b7280] dark:text-[#94a3b8] mt-4">As maiores quedas (em vermelho) são seus gargalos — onde o lead trava no caminho até virar paciente.</p>
          </Section>

          <Section title="Por que perdemos leads" icon={TrendingDown}>
            <Bars data={motivosPerda} color={C.rose} />
            <p className="text-[11px] text-[#6b7280] dark:text-[#94a3b8] mt-3">
              {r ? `${r.perdidos_total} lead(s) perdido(s). ` : ''}A Nathalia marca o motivo quando o paciente diz por que não seguiu (preço, agenda, convênio…). <b>Silêncio</b> = parou de responder sem dar motivo.
            </p>
          </Section>
        </div>
      )}

      {/* ───── CANAIS ───── */}
      {tab === 'canais' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Origem da base (1.205 pacientes)" icon={Megaphone}>
            <Bars data={(r?.canais ?? []).map(c => ({ label: c.canal, n: c.n }))} color={C.gold} />
          </Section>
          <Section title="Origem dos leads novos (kanban)" icon={Megaphone}>
            <Bars data={origensLead} color={C.navy} />
            <Soon items={['Custo por lead / por paciente (precisa do gasto de anúncio do Meta/Google)', 'ROI por campanha', 'Faturamento por canal (assim que houver mais pagamentos)']} />
          </Section>
        </div>
      )}

      {/* ───── ROI / ANÚNCIOS ───── */}
      {tab === 'roi' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi icon={Wallet} label="Gasto em anúncios" value={r ? formatarMoeda(r.roi_gasto_total) : '—'} sub="total" grad={['#b3263f', C.rose]} />
            <Kpi icon={Megaphone} label="Leads de anúncio" value={String(roiLeads)} grad={[C.navy, C.slate]} />
            <Kpi icon={Target} label="Custo / lead" value={r && roiLeads ? formatarMoeda(r.roi_gasto_total / roiLeads) : '—'} grad={['#9a7d2f', C.gold]} />
            <Kpi icon={HeartPulse} label="Custo / paciente (CAC)" value={r && roiPac ? formatarMoeda(r.roi_gasto_total / roiPac) : '—'} grad={['#0e7a4f', C.emerald]} />
          </div>
          <Section title="ROI por campanha" icon={Target}>
            {roiCampanhas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#d8d4cb] dark:border-[#2c3c58] p-6 text-center">
                <p className="text-sm font-semibold text-[#0b1a35] dark:text-white">Pronto e esperando os anúncios 🎯</p>
                <p className="text-[12px] text-[#6b7280] dark:text-[#94a3b8] mt-2 max-w-xl mx-auto leading-relaxed">A <b>Meta</b> já está conectada — o gasto sincroniza sozinho todo dia. O <b>Google</b> está aguardando aprovação da API. Quando uma campanha rodar, cada linha aqui mostra <b>gasto, leads, pacientes, custo por lead e CAC</b> por campanha.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[#6b7280] dark:text-[#94a3b8] border-b border-[#eceae4] dark:border-[#22304c]">
                      <th className="py-2 font-semibold">Campanha</th>
                      <th className="py-2 font-semibold text-right">Gasto</th>
                      <th className="py-2 font-semibold text-right">Leads</th>
                      <th className="py-2 font-semibold text-right">Pacientes</th>
                      <th className="py-2 font-semibold text-right">Custo/lead</th>
                      <th className="py-2 font-semibold text-right">CAC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roiCampanhas.map((c, i) => (
                      <tr key={i} className="border-b border-[#f2f0ea] dark:border-[#1a2740]">
                        <td className="py-2 font-medium text-[#0b1a35] dark:text-white">{c.campanha} <span className="text-[10px] text-[#6b7280] uppercase">· {c.origem}</span></td>
                        <td className="py-2 text-right font-mono">{formatarMoeda(c.gasto)}</td>
                        <td className="py-2 text-right">{c.leads}</td>
                        <td className="py-2 text-right">{c.pacientes}</td>
                        <td className="py-2 text-right font-mono">{c.leads ? formatarMoeda(c.gasto / c.leads) : '—'}</td>
                        <td className="py-2 text-right font-mono">{c.pacientes ? formatarMoeda(c.gasto / c.pacientes) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ───── MÍDIA / TRÁFEGO PAGO ───── */}
      {tab === 'midia' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {MIDIA_TIPOS.map(t => (
              <button key={t.id} onClick={() => setMidiaTipo(t.id)}
                className={cn('px-4 py-2 rounded-xl border text-left transition-all',
                  midiaTipo === t.id ? 'border-[#c2a650] bg-[#c2a650]/10' : 'border-[#eceae4] dark:border-[#22304c] hover:border-[#c2a650]/50')}>
                <span className="block text-sm font-bold text-[#0b1a35] dark:text-white">{t.label}</span>
                <span className="block text-[10px] text-[#6b7280] dark:text-[#94a3b8]">{t.sub}</span>
              </button>
            ))}
          </div>

          {midiaRows.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm font-semibold text-[#0b1a35] dark:text-white">Esperando os anúncios 📡</p>
              <p className="text-[12px] text-[#6b7280] dark:text-[#94a3b8] mt-2 max-w-xl mx-auto leading-relaxed">Quando rodar uma campanha de <b>{MIDIA_TIPOS.find(t => t.id === midiaTipo)?.label}</b>, as métricas aparecem aqui. A Meta já sincroniza sozinha; o Google entra após a aprovação.</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {midiaTipo === 'distribuicao' && (<>
                  <Kpi icon={Wallet} label="Investimento" value={formatarMoeda(mt.gasto)} grad={['#b3263f', C.rose]} />
                  <Kpi icon={Users} label="Alcance" value={mNum(mt.reach)} sub="pessoas únicas" grad={[C.navy, C.slate]} />
                  <Kpi icon={Megaphone} label="CPM" value={formatarMoeda(mDiv(mt.gasto, mt.impressoes) * 1000)} sub="custo/mil" grad={['#9a7d2f', C.gold]} />
                  <Kpi icon={Repeat2} label="Frequência" value={mDiv(mt.impressoes, mt.reach).toFixed(1).replace('.', ',')} sub="média" grad={['#6d3fb3', C.violet]} />
                </>)}
                {midiaTipo === 'conversao' && (<>
                  <Kpi icon={Wallet} label="Investimento" value={formatarMoeda(mt.gasto)} grad={['#b3263f', C.rose]} />
                  <Kpi icon={Megaphone} label="Resultados" value={mNum(mt.res_leads)} sub="leads / conversas" grad={[C.navy, C.slate]} />
                  <Kpi icon={Target} label="Custo / resultado" value={mt.res_leads ? formatarMoeda(mDiv(mt.gasto, mt.res_leads)) : '—'} grad={['#9a7d2f', C.gold]} />
                  <Kpi icon={TrendingUp} label="ROAS" value={mt.gasto ? mDiv(mt.valor, mt.gasto).toFixed(2).replace('.', ',') + 'x' : '—'} sub="retorno" grad={['#0e7a4f', C.emerald]} />
                </>)}
                {midiaTipo === 'search' && (<>
                  <Kpi icon={Wallet} label="Investimento" value={formatarMoeda(mt.gasto)} grad={['#b3263f', C.rose]} />
                  <Kpi icon={Megaphone} label="Conversões" value={mNum(mt.res_leads)} grad={[C.navy, C.slate]} />
                  <Kpi icon={Target} label="Custo / conversão" value={mt.res_leads ? formatarMoeda(mDiv(mt.gasto, mt.res_leads)) : '—'} grad={['#9a7d2f', C.gold]} />
                  <Kpi icon={TrendingUp} label="Cliques" value={mNum(mt.cliques)} sub={`CTR ${mPct(mDiv(mt.cliques, mt.impressoes))}`} grad={['#0e6b80', C.cyan]} />
                </>)}
              </div>

              <Section title="Por campanha" icon={Activity}>
                {midiaTipo === 'distribuicao' && (
                  <MidiaTable rows={midiaRows} cols={[
                    { h: 'Campanha', f: c => c.campanha },
                    { h: 'Gasto', f: c => formatarMoeda(c.gasto) },
                    { h: 'Alcance', f: c => mNum(c.reach) },
                    { h: 'Impressões', f: c => mNum(c.impressoes) },
                    { h: 'Freq', f: c => mDiv(c.impressoes, c.reach).toFixed(1).replace('.', ',') },
                    { h: 'CPM', f: c => formatarMoeda(mDiv(c.gasto, c.impressoes) * 1000) },
                    { h: 'CTR', f: c => mPct(mDiv(c.cliques, c.impressoes)) },
                    { h: 'CPC', f: c => c.cliques ? formatarMoeda(mDiv(c.gasto, c.cliques)) : '—' },
                    { h: 'ThruPlay', f: c => mNum(c.thruplay) },
                    { h: '50% vídeo', f: c => mPct(mDiv(c.video_p50, c.video_3s)) },
                  ]} />
                )}
                {midiaTipo === 'conversao' && (
                  <MidiaTable rows={midiaRows} cols={[
                    { h: 'Campanha', f: c => c.campanha },
                    { h: 'Gasto', f: c => formatarMoeda(c.gasto) },
                    { h: 'CTR', f: c => mPct(mDiv(c.cliques, c.impressoes)) },
                    { h: 'CPC', f: c => c.cliques ? formatarMoeda(mDiv(c.gasto, c.cliques)) : '—' },
                    { h: 'Leads', f: c => mNum(c.res_leads) },
                    { h: 'Conversas', f: c => mNum(c.res_conversas) },
                    { h: 'Compras', f: c => mNum(c.res_compras) },
                    { h: 'Custo/lead', f: c => c.res_leads ? formatarMoeda(mDiv(c.gasto, c.res_leads)) : '—' },
                    { h: 'Valor', f: c => formatarMoeda(c.valor_conversao) },
                    { h: 'ROAS', f: c => c.gasto ? mDiv(c.valor_conversao, c.gasto).toFixed(2).replace('.', ',') + 'x' : '—' },
                  ]} />
                )}
                {midiaTipo === 'search' && (
                  <MidiaTable rows={midiaRows} cols={[
                    { h: 'Campanha', f: c => c.campanha },
                    { h: 'Gasto', f: c => formatarMoeda(c.gasto) },
                    { h: 'Impressões', f: c => mNum(c.impressoes) },
                    { h: 'Cliques', f: c => mNum(c.cliques) },
                    { h: 'CTR', f: c => mPct(mDiv(c.cliques, c.impressoes)) },
                    { h: 'CPC', f: c => c.cliques ? formatarMoeda(mDiv(c.gasto, c.cliques)) : '—' },
                    { h: 'Conversões', f: c => mNum(c.res_leads) },
                    { h: 'Custo/conv', f: c => c.res_leads ? formatarMoeda(mDiv(c.gasto, c.res_leads)) : '—' },
                    { h: 'Parcela imp', f: c => mPct(c.impression_share) },
                    { h: 'Perda orç', f: c => mPct(c.lost_is_budget) },
                    { h: 'Perda rank', f: c => mPct(c.lost_is_rank) },
                  ]} />
                )}
                <p className="text-[11px] text-[#6b7280] dark:text-[#94a3b8] mt-3">As métricas de <b>resultado</b> (leads, conversas, compras, ROAS) dependem do pixel/conversões configurados. O detalhe fino (criativo, termos de busca) fica no próprio Gerenciador.</p>
              </Section>
            </>
          )}
        </div>
      )}

      {/* ───── ATENDIMENTO ───── */}
      {tab === 'whats' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi icon={MessageSquare} label="Conversas abertas" value={cw ? String(cw.conversas_abertas) : '—'} sub="no Chatwoot" grad={[C.navy, C.slate]} />
            <Kpi icon={AlertTriangle} label="Aguardando atendimento" value={cw ? String(cw.conversas_aguardando) : '—'} sub="esperando uma pessoa" grad={['#b3263f', C.rose]} />
            <Kpi icon={MessageSquare} label="Conversas (30d)" value={cw ? String(cw.conversas_periodo) : '—'} grad={['#0e6b80', C.cyan]} />
            <Kpi icon={Flame} label="Mensagens (30d)" value={cw ? String(cw.msgs_recebidas + cw.msgs_enviadas) : '—'} sub={cw ? `${cw.msgs_recebidas} recebidas` : ''} grad={['#9a7d2f', C.gold]} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-3 content-start">
              <Kpi icon={MessageSquare} label="Leads ativos" value={String(L.total - L.dormentes)} sub="em atendimento" grad={[C.navy, C.slate]} />
              <Kpi icon={AlertTriangle} label="Pendências abertas" value={String(leads.filter(l => l.etapa_atual === 'Pendência').length)} grad={['#b3263f', C.rose]} />
              <Kpi icon={Flame} label="Quentes agora" value={String(L.quentes)} sub="urgente/alta" grad={['#9a7d2f', C.gold]} />
              <Kpi icon={Moon} label="Dormentes" value={String(L.dormentes)} sub="p/ reativar" grad={[C.slate, '#5a6b8a']} />
            </div>
            <Section title="Atendimento humano (fora da IA)" icon={Clock}>
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 mb-3 text-[13px] text-emerald-700 dark:text-emerald-400 font-medium">
                ⚡ A Nathalia (IA) responde em segundos.
              </div>
              {(() => {
                const resolN = cw?.resolucoes_n ?? 0;
                const fr = cw?.tempo_primeira_resposta_s ?? 0;
                // valor só é confiável com amostra mínima / dentro de um patamar plausível — senão é outlier de conversa parada
                const okResol = resolN >= 3;
                const okFR = fr > 0 && fr < 4 * 3600;
                const muted = 'text-[#9aa3b2] dark:text-[#6b7280] font-medium';
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#6b7280] dark:text-[#94a3b8]">Conversas resolvidas (30d)</span>
                      <span className="font-bold text-[#0b1a35] dark:text-white">{cw ? resolN : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#6b7280] dark:text-[#94a3b8]">Tempo até resolver (média)</span>
                      {okResol
                        ? <span className="font-bold text-[#0b1a35] dark:text-white">{fmtDur(cw?.tempo_resolucao_s)}</span>
                        : <span className={muted}>poucos dados{cw ? ` (N=${resolN})` : ''}</span>}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#6b7280] dark:text-[#94a3b8]">1ª resposta quando uma pessoa assume</span>
                      {okFR
                        ? <span className="font-bold text-[#0b1a35] dark:text-white">{fmtDur(fr)}</span>
                        : <span className={muted}>poucos casos</span>}
                    </div>
                  </div>
                );
              })()}
              <p className="text-[11px] text-[#6b7280] dark:text-[#94a3b8] mt-4">Estes tempos contam <b>só</b> as conversas que uma pessoa assumiu ou resolveu na mão — como são poucos casos, a média oscila muito (um único atendimento parado já joga o número lá pra cima). No dia a dia, o número que importa é <b>Aguardando atendimento</b> ali em cima.</p>
              <Soon items={['Tempo médio até o agendamento (1º contato × 1ª consulta)', 'Conversas sem resposta há mais de X horas']} />
            </Section>
          </div>
        </div>
      )}

      {/* ───── AGENDA ───── */}
      {tab === 'agenda' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi icon={CalendarCheck} label="Agendadas (futuras)" value={r ? String(r.consultas_agendadas) : '—'} grad={['#0e6b80', C.cyan]} />
            <Kpi icon={HeartPulse} label="Realizadas" value={r ? String(r.consultas_realizadas) : '—'} grad={['#0e7a4f', C.emerald]} />
            <Kpi icon={CalendarX2} label="No-show" value={r ? String(r.consultas_no_show) : '—'} grad={['#b3263f', C.rose]} />
            <Kpi icon={RotateCcw} label="Canceladas" value={r ? String(r.consultas_canceladas) : '—'} grad={[C.slate, '#5a6b8a']} />
          </div>
          <Section title="Aproveitamento da agenda" icon={CalendarDays}>
            <div className="flex items-center justify-around flex-wrap gap-4">
              <Donut value={taxaComparecimento} label="Comparecimento" color={C.emerald} />
              <Donut value={taxaCancel} label="Cancelamento" color={C.rose} />
              <Donut value={r && r.consultas_total > 0 ? (r.consultas_retorno / r.consultas_total) * 100 : 0} label="São retorno" color={C.violet} />
            </div>
            <Soon items={['Taxa de ocupação da agenda + horários ociosos (cruzar com o Google Calendar)', 'Consultas por dia/semana (assim que houver volume)']} />
          </Section>
        </div>
      )}

      {/* ───── PACIENTES ───── */}
      {tab === 'pacientes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Kpi icon={Users} label="Base total" value={r ? String(r.pacientes_total) : '—'} grad={[C.navy, C.slate]} />
            <Kpi icon={Stethoscope} label="Com procedimento" value={r ? String(r.pacientes_com_proc) : '—'} grad={['#9a7d2f', C.gold]} />
            <Kpi icon={Moon} label="Inativos 90d+" value={r ? String(r.pacientes_inativos_90d) : '—'} sub="p/ reativar" grad={[C.slate, '#5a6b8a']} />
            <Kpi icon={RotateCcw} label="Retorno previsto" value={r ? String(r.retornos_previstos) : '—'} grad={['#6d3fb3', C.violet]} />
            <Kpi icon={Gift} label="Aniversariantes" value={r ? String(r.aniversariantes_mes) : '—'} sub="este mês" grad={['#b3263f', C.rose]} />
          </div>
          <Section title="Pacientes por perfil / nicho" icon={HeartPulse}>
            <Bars data={(r?.nichos ?? []).map(n => ({ label: n.nicho, n: n.n }))} color={C.violet} />
            <p className="text-[11px] text-[#6b7280] dark:text-[#94a3b8] mt-3">Use isso pra campanhas segmentadas (ex.: todos de um nicho específico). Conforme a IA aplica tags clínicas, esse corte fica mais rico.</p>
          </Section>
        </div>
      )}

      {/* ───── FINANCEIRO ───── */}
      {tab === 'financeiro' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi icon={DollarSign} label="Faturamento" value={r ? formatarMoeda(r.faturamento_total) : '—'} sub={periodo === 'tudo' ? 'no período: tudo' : periodoLabel} grad={['#0e7a4f', C.emerald]} />
            <Kpi icon={Wallet} label="Este mês" value={r ? formatarMoeda(r.faturamento_mes) : '—'} sub="faturamento do mês atual" grad={['#9a7d2f', C.gold]} />
            <Kpi icon={TrendingUp} label="Ticket médio" value={formatarMoeda(ticket)} sub="por paciente pagante" grad={[C.navy, C.slate]} />
            <Kpi icon={CalendarCheck} label="Receita prevista" value={r ? formatarMoeda(r.receita_prevista) : '—'} sub="valor dos agendados" grad={['#6d3fb3', C.violet]} />
          </div>
          <Section title="Faturamento por método de pagamento" icon={Wallet}>
            <Bars data={(r?.fat_por_metodo ?? []).map(m => ({ label: m.metodo, n: Math.round(m.valor) }))} color={C.emerald} />
            <Soon items={['Faturamento por serviço (consulta/retorno/procedimento)', 'Receita por canal de origem', 'Receita perdida estimada (faltas + cancelamentos)']} />
          </Section>
        </div>
      )}

      {/* ───── EXPERIÊNCIA ───── */}
      {tab === 'experiencia' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Indicações" icon={Smile}>
            <Donut value={L.total > 0 ? (leads.filter(l => l.origem === 'Indicação' || l.foi_indicacao).length / L.total) * 100 : 0} label="Vieram por indicação" color={C.gold} sub={`${leads.filter(l => l.origem === 'Indicação' || l.foi_indicacao).length} de ${L.total} leads`} />
          </Section>
          <Section title="Satisfação (NPS)" icon={Smile}>
            {(r?.nps?.n ?? 0) === 0 ? (
              <div className="rounded-xl border border-dashed border-[#d8d4cb] dark:border-[#2c3c58] p-5 text-center">
                <p className="text-sm font-semibold text-[#0b1a35] dark:text-white">A Nathalia já pergunta a nota 📊</p>
                <p className="text-[12px] text-[#6b7280] dark:text-[#94a3b8] mt-2 max-w-md mx-auto leading-relaxed">No pós-consulta ela pede de 0 a 10 &quot;o quanto recomendaria o Dr. Luiz&quot;. O NPS aparece aqui conforme os pacientes respondem.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-around flex-wrap gap-3 mb-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold leading-none" style={{ color: r!.nps!.score >= 50 ? C.emerald : r!.nps!.score >= 0 ? C.gold : C.rose }}>{r!.nps!.score > 0 ? '+' : ''}{r!.nps!.score}</p>
                    <p className="text-[11px] text-[#6b7280] dark:text-[#94a3b8] mt-1 uppercase tracking-wide">NPS</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold leading-none text-[#0b1a35] dark:text-white">{r!.nps!.media}</p>
                    <p className="text-[11px] text-[#6b7280] dark:text-[#94a3b8] mt-1">nota média</p>
                  </div>
                </div>
                <Bars color={C.emerald} data={[
                  { label: 'Promotores (9–10)', n: r!.nps!.promotores },
                  { label: 'Neutros (7–8)', n: r!.nps!.neutros },
                  { label: 'Detratores (0–6)', n: r!.nps!.detratores },
                ]} />
                <p className="text-[11px] text-[#6b7280] dark:text-[#94a3b8] mt-3">{r!.nps!.n} resposta(s) · NPS = % promotores − % detratores (−100 a +100).</p>
              </div>
            )}
          </Section>

          {/* ── Avaliações do Google (Places API → tabela google_reviews, sync 2x/dia) ── */}
          <Section title="Avaliações do Google" icon={Star} className="lg:col-span-2"
            right={r?.google_reviews?.maps_uri ? (
              <a href={r.google_reviews.maps_uri} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-[#c2a650] hover:underline">Ver no Google ↗</a>
            ) : undefined}>
            {!r?.google_reviews ? (
              <div className="rounded-xl border border-dashed border-[#d8d4cb] dark:border-[#2c3c58] p-5 text-center">
                <p className="text-sm font-semibold text-[#0b1a35] dark:text-white">Sincronizando avaliações do Google… ⭐</p>
                <p className="text-[12px] text-[#6b7280] dark:text-[#94a3b8] mt-2">Atualiza automaticamente 2x por dia.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-5 flex-wrap mb-4">
                  <div className="text-center">
                    <p className="text-5xl font-bold leading-none text-[#0b1a35] dark:text-white">{Number(r.google_reviews.rating).toFixed(1).replace('.', ',')}</p>
                    <div className="mt-1.5"><Stars n={r.google_reviews.rating} /></div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0b1a35] dark:text-white">{mNum(r.google_reviews.total)} avaliações no Google</p>
                    <p className="text-[11px] text-[#6b7280] dark:text-[#94a3b8] mt-0.5">Mostra as 5 mais recentes · atualizado 2x/dia</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {r.google_reviews.reviews.map((rv, i) => (
                    <div key={i} className="rounded-xl border border-[#ece9e1] dark:border-[#22314c] p-3 bg-[#faf9f6] dark:bg-[#0b1a35]/40">
                      <div className="flex items-center gap-2 mb-1.5">
                        {rv.foto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={rv.foto} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold" style={{ background: 'rgba(194,166,80,0.18)', color: C.gold }}>{(rv.autor || '?').charAt(0).toUpperCase()}</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold text-[#0b1a35] dark:text-white truncate">{rv.autor || 'Anônimo'}</p>
                          <div className="flex items-center gap-1.5"><Stars n={rv.nota} size={11} /><span className="text-[10px] text-[#9ca3af]">{rv.quando}</span></div>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#4b5563] dark:text-[#94a3b8] leading-relaxed">{rv.texto.length > 260 ? rv.texto.slice(0, 260) + '…' : rv.texto}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
