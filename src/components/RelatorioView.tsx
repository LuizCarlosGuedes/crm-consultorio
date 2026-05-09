'use client';

import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { differenceInDays, subDays } from 'date-fns';
import { Users, TrendingUp, Clock, CalendarDays } from 'lucide-react';
import { Lead } from '@/lib/types';
import { PIPELINE_1, PIPELINE_2, TODAS_ETAPAS } from '@/lib/constants';
import { formatarMoeda, cn } from '@/lib/utils';

interface RelatorioViewProps {
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

export function RelatorioView({ leads }: RelatorioViewProps) {
  const now = new Date();

  const { leadsP1, leadsP2, leadsPerStage, conversao, tempoMedio, por7d, por30d, por90d, receitaTotal } = useMemo(() => {
    const p1 = leads.filter(l => (l.pipeline_id ?? 1) === 1);
    const p2 = leads.filter(l => (l.pipeline_id ?? 1) === 2);

    // Leads por etapa (apenas etapas com leads)
    const perStage = TODAS_ETAPAS.map(e => ({
      nome: e.nome.length > 14 ? e.nome.slice(0, 14) + '…' : e.nome,
      nomeCompleto: e.nome,
      total: leads.filter(l => l.etapa_atual === e.id).length,
      cor: e.corHex,
      pipeline: e.pipeline,
    })).filter(e => e.total > 0);

    // Conversão P1: leads que chegaram a Agendado, Sinal Pago ou além / total P1
    const convertidos = p1.filter(l =>
      ['Agendado', 'Sinal Pago', 'No Show', 'Reagendamento'].includes(l.etapa_atual)
    ).length;
    const conv = p1.length > 0 ? (convertidos / p1.length) * 100 : 0;

    // Tempo médio até Agendado (usando data_atualizacao dos que estão em Agendado como proxy)
    const agendados = p1.filter(l => l.etapa_atual === 'Agendado');
    const medio = agendados.length > 0
      ? agendados.reduce((s, l) => {
          const d = differenceInDays(new Date(l.data_atualizacao), new Date(l.data_entrada));
          return s + Math.max(0, d);
        }, 0) / agendados.length
      : 0;

    // Cards criados por período
    const contarPeriodo = (dias: number) =>
      leads.filter(l => differenceInDays(now, new Date(l.data_entrada)) <= dias).length;

    const receita = leads.reduce((s, l) => s + (l.total_investido ?? l.valor_consulta ?? 0), 0);

    return {
      leadsP1: p1,
      leadsP2: p2,
      leadsPerStage: perStage,
      conversao: conv,
      tempoMedio: medio,
      por7d:  contarPeriodo(7),
      por30d: contarPeriodo(30),
      por90d: contarPeriodo(90),
      receitaTotal: receita,
    };
  }, [leads]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { nomeCompleto: string; total: number; pipeline: number } }> }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs font-semibold">{d.nomeCompleto}</p>
        <p className="text-xs text-muted-foreground">Pipeline {d.pipeline}</p>
        <p className="text-sm font-bold mt-0.5">{d.total} leads</p>
      </div>
    );
  };

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Relatório Geral</h2>
        <span className="text-xs text-muted-foreground">{leads.length} leads no total</span>
      </div>

      {/* ── Métricas principais ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={Users}
          label="Pipeline 1 (Captação)"
          value={String(leadsP1.length)}
          sub={`${leadsP2.length} no Pipeline 2`}
          color="bg-blue-500"
        />
        <MetricCard
          icon={TrendingUp}
          label="Taxa de Conversão P1"
          value={`${conversao.toFixed(1)}%`}
          sub="leads que chegaram a Agendado"
          color="bg-emerald-500"
        />
        <MetricCard
          icon={Clock}
          label="Tempo médio até Agendado"
          value={tempoMedio > 0 ? `${Math.round(tempoMedio)}d` : '—'}
          sub="desde entrada no pipeline"
          color="bg-violet-500"
        />
        <MetricCard
          icon={CalendarDays}
          label="Novos nos últimos 30d"
          value={String(por30d)}
          sub={`7d: ${por7d}  ·  90d: ${por90d}`}
          color="bg-amber-500"
        />
      </div>

      {/* ── Leads por etapa ── */}
      {leadsPerStage.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-4">Leads por Etapa</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={leadsPerStage} margin={{ top: 0, right: 8, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="nome"
                tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                {leadsPerStage.map((entry, i) => (
                  <Cell key={i} fill={entry.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Captação por período ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">Captação por Período</h3>
          <div className="space-y-2">
            {[
              { label: 'Últimos 7 dias',  value: por7d  },
              { label: 'Últimos 30 dias', value: por30d },
              { label: 'Últimos 90 dias', value: por90d },
              { label: 'Total geral',     value: leads.length },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full bg-brand-gold/70"
                    style={{ width: `${Math.min(100, (row.value / Math.max(leads.length, 1)) * 120)}px` }}
                  />
                  <span className="text-sm font-bold w-8 text-right">{row.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">Distribuição por Prioridade</h3>
          <div className="space-y-2">
            {[
              { label: 'Urgente', value: leads.filter(l => l.prioridade === 'urgente').length, cor: '#EF4444' },
              { label: 'Alta',    value: leads.filter(l => l.prioridade === 'alta').length,    cor: '#F97316' },
              { label: 'Normal',  value: leads.filter(l => l.prioridade === 'normal').length,  cor: '#10B981' },
              { label: 'Frio',    value: leads.filter(l => l.prioridade === 'frio').length,    cor: '#6B7280' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      backgroundColor: row.cor,
                      width: `${Math.min(100, (row.value / Math.max(leads.length, 1)) * 120)}px`,
                    }}
                  />
                  <span className="text-sm font-bold w-8 text-right">{row.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Etapas Pipeline 1 ── */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">Pipeline 1 — Captação (etapas)</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {PIPELINE_1.map(etapa => {
            const count = leads.filter(l => l.etapa_atual === etapa.id).length;
            return (
              <div
                key={etapa.id}
                className="rounded-lg p-2 text-center border"
                style={{ backgroundColor: `${etapa.corHex}15`, borderColor: `${etapa.corHex}50` }}
              >
                <p className="text-lg font-bold" style={{ color: etapa.corHex }}>{count}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{etapa.nome}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Etapas Pipeline 2 ── */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">Pipeline 2 — Pacientes Ativos (etapas)</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {PIPELINE_2.map(etapa => {
            const count = leads.filter(l => l.etapa_atual === etapa.id).length;
            return (
              <div
                key={etapa.id}
                className="rounded-lg p-2 text-center border"
                style={{ backgroundColor: `${etapa.corHex}15`, borderColor: `${etapa.corHex}50` }}
              >
                <p className="text-lg font-bold" style={{ color: etapa.corHex }}>{count}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{etapa.nome}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
