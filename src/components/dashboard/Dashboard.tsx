'use client';

import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { subWeeks, subMonths, startOfWeek, startOfMonth, format, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, Activity, TrendingUp, DollarSign, Repeat2, AlertTriangle, HeartPulse } from 'lucide-react';
import { Lead } from '@/lib/types';
import { ETAPAS } from '@/lib/constants';
import { calcSLAStatus, formatarMoeda, cn } from '@/lib/utils';

interface DashboardProps {
  leads: Lead[];
}

function MetricCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CHART_COLORS = {
  primary: '#3B82F6',
  emerald: '#10B981',
  violet:  '#8B5CF6',
  amber:   '#F59E0B',
  rose:    '#F43F5E',
};

export function Dashboard({ leads }: DashboardProps) {
  const now = new Date();

  const metrics = useMemo(() => {
    const total = leads.length;
    const ativos = leads.filter(l => !['Perdido'].includes(l.etapa_atual)).length;
    const compareceram = leads.filter(l => l.etapa_atual === 'Compareceu').length;
    const pagos = leads.filter(l => l.etapa_atual === 'Pago / Confirmado').length;
    const recorrentes = leads.filter(l => l.etapa_atual === 'Recorrente').length;
    const noShow = leads.filter(l => l.etapa_atual === 'No Show').length;

    const receitaConfirmada = leads
      .filter(l => ['Pago / Confirmado', 'Compareceu', 'Recorrente'].includes(l.etapa_atual))
      .reduce((s, l) => s + (l.valor_consulta || 0), 0);

    const taxaConversao = total > 0 ? (compareceram / total) * 100 : 0;
    const ticketMedio = compareceram > 0
      ? leads.filter(l => l.etapa_atual === 'Compareceu').reduce((s, l) => s + (l.valor_consulta || 0), 0) / compareceram
      : 0;
    const taxaRetorno = total > 0 ? (recorrentes / total) * 100 : 0;
    const taxaNoShow = compareceram + noShow > 0 ? (noShow / (compareceram + noShow)) * 100 : 0;

    const slaAtrasados = leads.filter(l => calcSLAStatus(l) === 'atrasado');

    return {
      total, ativos, compareceram, pagos, recorrentes, noShow,
      receitaConfirmada, taxaConversao, ticketMedio, taxaRetorno, taxaNoShow,
      slaAtrasados,
    };
  }, [leads]);

  // Leads por semana (últimas 8 semanas)
  const leadsPorSemana = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const weekStart = startOfWeek(subWeeks(now, 7 - i), { locale: ptBR });
      const weekEnd   = startOfWeek(subWeeks(now, 6 - i), { locale: ptBR });
      const count = leads.filter(l => {
        const d = new Date(l.data_entrada);
        return isAfter(d, weekStart) && isBefore(d, weekEnd);
      }).length;
      return {
        semana: format(weekStart, "'S'w", { locale: ptBR }),
        leads: count,
      };
    });
  }, [leads]);

  // Faturamento por mês (últimos 6 meses)
  const faturamentoPorMes = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const monthStart = startOfMonth(subMonths(now, 5 - i));
      const monthEnd   = startOfMonth(subMonths(now, 4 - i));
      const valor = leads
        .filter(l => {
          const d = new Date(l.data_entrada);
          return isAfter(d, monthStart) && isBefore(d, monthEnd) &&
            ['Pago / Confirmado', 'Compareceu', 'Recorrente'].includes(l.etapa_atual);
        })
        .reduce((s, l) => s + (l.valor_consulta || 0), 0);
      return {
        mes: format(monthStart, 'MMM', { locale: ptBR }),
        valor,
      };
    });
  }, [leads]);

  // Procedimentos mais agendados (top 6)
  const procedimentos = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      if (l.procedimento) counts[l.procedimento] = (counts[l.procedimento] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([nome, count]) => ({ nome: nome.length > 20 ? nome.slice(0, 18) + '…' : nome, count }));
  }, [leads]);

  // Origem dos leads
  const origens = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => { counts[l.origem] = (counts[l.origem] || 0) + 1; });
    const total = leads.length;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([origem, count]) => ({
        origem,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
  }, [leads]);

  // Distribuição por etapa
  const distribuicaoPorEtapa = useMemo(() => {
    return ETAPAS.map(e => ({
      etapa: e,
      count: leads.filter(l => l.etapa_atual === e.id).length,
    })).filter(x => x.count > 0);
  }, [leads]);

  const customTooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard icon={Users}     label="Total de Leads"     value={String(metrics.total)}    color="bg-blue-500" />
        <MetricCard icon={Activity}  label="Leads Ativos"       value={String(metrics.ativos)}   color="bg-violet-500" sub={`${metrics.total - metrics.ativos} perdidos`} />
        <MetricCard icon={HeartPulse} label="Consultas Realizadas" value={String(metrics.compareceram)} sub={`${metrics.taxaConversao.toFixed(1)}% conversão`} color="bg-cyan-500" />
        <MetricCard icon={DollarSign} label="Receita Confirmada"  value={formatarMoeda(metrics.receitaConfirmada)} color="bg-emerald-500" />
        <MetricCard icon={TrendingUp} label="Ticket Médio"        value={formatarMoeda(metrics.ticketMedio)} color="bg-amber-500" />
        <MetricCard icon={Repeat2}    label="Taxa de Retorno"     value={`${metrics.taxaRetorno.toFixed(1)}%`} sub={`${metrics.recorrentes} recorrentes`} color="bg-rose-500" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leads por semana */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-4">Novos Leads por Semana (últimas 8 semanas)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={leadsPorSemana}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="semana" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <RechartsTooltip contentStyle={customTooltipStyle} />
              <Bar dataKey="leads" name="Leads" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Faturamento por mês */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-4">Faturamento por Mês (últimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={faturamentoPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${v}`} />
              <RechartsTooltip contentStyle={customTooltipStyle} formatter={(v: number) => [formatarMoeda(v), 'Faturamento']} />
              <Bar dataKey="valor" name="Faturamento" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Procedimentos */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-4">Procedimentos Mais Agendados (Top 6)</h3>
          {procedimentos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={procedimentos} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={130} />
                <RechartsTooltip contentStyle={customTooltipStyle} />
                <Bar dataKey="count" name="Agendamentos" radius={[0, 4, 4, 0]}>
                  {procedimentos.map((_, i) => (
                    <Cell key={i} fill={[CHART_COLORS.violet, CHART_COLORS.primary, CHART_COLORS.amber, CHART_COLORS.emerald, CHART_COLORS.rose, '#06B6D4'][i % 6]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Origem dos leads */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-4">Origem dos Leads</h3>
          {origens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          ) : (
            <div className="space-y-3 mt-2">
              {origens.map((o, i) => (
                <div key={o.origem} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{o.origem}</span>
                    <span className="text-muted-foreground">{o.count} leads · {o.pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${o.pct}%`,
                        backgroundColor: [CHART_COLORS.primary, '#EC4899', CHART_COLORS.emerald, CHART_COLORS.amber][i % 4],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Distribuição por etapa */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">Distribuição por Etapa</h3>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {ETAPAS.map(e => {
              const count = leads.filter(l => l.etapa_atual === e.id).length;
              const pct = leads.length > 0 ? (count / leads.length) * 100 : 0;
              return (
                <div key={e.id} className="flex items-center gap-2">
                  <span className={cn('text-xs flex-1 truncate', e.cor)}>{e.nome}</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: e.corHex }} />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* SLA Alerts */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Alertas de SLA ({metrics.slaAtrasados.length})
          </h3>
          {metrics.slaAtrasados.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum SLA vencido!</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {metrics.slaAtrasados.map(l => (
                <div key={l.id} className="flex items-start gap-2 p-2 bg-red-500/5 border border-red-500/20 rounded">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-sla-pulse mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{l.nome}</p>
                    <p className="text-[10px] text-red-400">{l.etapa_atual}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{l.telefone}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saúde do funil */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-emerald-500" />
            Saúde do Funil
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Taxa de Conversão',    value: `${metrics.taxaConversao.toFixed(1)}%`,  ok: metrics.taxaConversao > 20,    color: 'text-emerald-500' },
              { label: 'Taxa de Retorno',       value: `${metrics.taxaRetorno.toFixed(1)}%`,   ok: metrics.taxaRetorno > 30,     color: 'text-cyan-500' },
              { label: 'Taxa de No-Show',       value: `${metrics.taxaNoShow.toFixed(1)}%`,    ok: metrics.taxaNoShow < 15,      color: 'text-orange-500' },
              { label: 'Fidelizados',           value: `${metrics.recorrentes}`,                ok: metrics.recorrentes > 0,      color: 'text-lime-500' },
              { label: 'SLAs Críticos',         value: `${metrics.slaAtrasados.length}`,        ok: metrics.slaAtrasados.length === 0, color: 'text-red-500' },
              { label: 'Leads Ativos',          value: `${metrics.ativos}`,                    ok: metrics.ativos > 0,           color: 'text-blue-500' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-bold', item.color)}>{item.value}</span>
                  <div className={cn('w-1.5 h-1.5 rounded-full', item.ok ? 'bg-emerald-500' : 'bg-red-500 animate-sla-pulse')} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
