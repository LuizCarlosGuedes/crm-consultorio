'use client';

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, Phone, Tag, Stethoscope, Loader2, Pencil, Save } from 'lucide-react';
import { Lead } from '@/lib/types';
import {
  calcSLAStatus, formatarTempoRelativo, formatarMoeda,
  getOrigemIcon, formatarTag, getEtapa, diasNaEtapa, cn,
  isSLAPausado, isComercial, ehTagInterna,
  getOrigemLead, ehNotaAutomatica,
} from '@/lib/utils';

interface KanbanCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  isOverlay?: boolean;
  onPacienteConsultou?: (lead: Lead) => Promise<void>;
  onQuickNota?: (lead: Lead, nota: string) => Promise<void>;
}

const ETAPAS_COM_BOTAO_CONSULTOU = new Set(['Agendado', 'Sinal Pago']);

// O aviso "A pagar" só faz sentido quando há consulta MARCADA e ainda não paga: as colunas de
// agendamento. Em qualquer outra (Proposta, Follow-up, No Show, etc.) o paciente não "deve" o
// valor — mostrar "A pagar R$X" ali seria errado. "Pago"/"Sinal" (dinheiro real) aparecem sempre.
const ETAPAS_COM_APAGAR = new Set(['Agendado', 'Retorno Agendado']);

const PRIORIDADE_LABEL: Record<string, string> = {
  urgente: 'URGENTE',
  alta:    'ALTA',
  normal:  'Normal',
  frio:    'Frio',
};

const PRIO_BADGE: Record<string, string> = {
  urgente: 'bg-red-100    text-red-700    border border-red-300    dark:bg-red-900/40    dark:text-red-400    dark:border-red-700',
  alta:    'bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-700',
  normal:  'bg-green-100  text-green-700  border border-green-300  dark:bg-green-900/40  dark:text-green-400  dark:border-green-700',
  frio:    'bg-slate-100  text-slate-600  border border-slate-300  dark:bg-slate-800     dark:text-slate-400  dark:border-slate-600',
};

export function KanbanCard({ lead, onClick, isOverlay, onPacienteConsultou, onQuickNota }: KanbanCardProps) {
  const [consultandoLoading, setConsultandoLoading] = useState(false);
  const [notaOpen,           setNotaOpen]           = useState(false);
  const [notaText,           setNotaText]           = useState('');
  const [notaSaving,         setNotaSaving]         = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id });

  const mostraBotaoConsultou =
    !isOverlay &&
    lead.pipeline_id === 1 &&
    ETAPAS_COM_BOTAO_CONSULTOU.has(lead.etapa_atual) &&
    !!onPacienteConsultou;

  const slaStatus = calcSLAStatus(lead);
  const slaPausado = isSLAPausado(lead);
  const comercial = isComercial(lead);
  const etapa     = getEtapa(lead.etapa_atual);
  const dias      = diasNaEtapa(lead);
  const slaLabel  =
    slaStatus === 'atrasado' ? 'SLA vencido — o lead passou do prazo desta etapa'
    : slaStatus === 'atencao'  ? 'SLA quase vencendo — faltam menos de 20% do prazo da etapa'
    : 'SLA dentro do prazo';

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    borderLeft: `4px solid ${etapa?.corHex ?? '#3f4e68'}`,
    // toque: card segue o dedo em qualquer direção (sem o navegador roubar o gesto p/ rolagem).
    touchAction: 'none' as const,
  };

  const tagsVisiveis = (lead.tags ?? []).filter(t => !ehTagInterna(t));
  const tagsMostrar = tagsVisiveis.slice(0, 3);

  function handlePencilClick(e: React.MouseEvent) {
    e.stopPropagation();
    setNotaText(lead.nota ?? '');
    setNotaOpen(true);
  }

  async function handleSaveNota(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onQuickNota || notaSaving) return;
    setNotaSaving(true);
    try {
      await onQuickNota(lead, notaText);
      setNotaOpen(false);
    } finally {
      setNotaSaving(false);
    }
  }

  async function handleConsultou(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onPacienteConsultou || consultandoLoading) return;
    setConsultandoLoading(true);
    try {
      await onPacienteConsultou(lead);
    } finally {
      setConsultandoLoading(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative rounded-lg cursor-grab active:cursor-grabbing select-none transition-all duration-150',
        'bg-card',
        'border border-brand-gray/60 dark:border-[#3f4e68]',
        'hover:shadow-md hover:border-brand-gold/60',
        isDragging && 'opacity-40',
        isOverlay  && 'shadow-2xl rotate-1 scale-105',
        lead.prioridade === 'urgente' && !isOverlay && 'animate-urgente',
      )}
      onClick={() => onClick(lead)}
    >
      <div className="px-3 pt-2.5 pb-2 space-y-1.5">

        {/* ── Header: origem + nome + prioridade ───────── */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-[11px] flex-shrink-0">{getOrigemIcon(lead.origem)}</span>
            <p className="font-semibold text-[13px] leading-tight line-clamp-1 flex-1 text-foreground">
              {lead.nome}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {lead.movido_por_ia && (
              <span className="px-1 py-0.5 rounded text-[9px] font-bold leading-none border bg-brand-navy/10 text-brand-navy border-brand-navy/30 dark:bg-brand-slate/20 dark:text-brand-gray dark:border-brand-slate/40">
                IA
              </span>
            )}
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-[9px] font-bold leading-none',
                PRIO_BADGE[lead.prioridade] ?? PRIO_BADGE.frio,
                lead.prioridade === 'urgente' && 'animate-sla-pulse',
              )}
            >
              {PRIORIDADE_LABEL[lead.prioridade] ?? lead.prioridade}
            </span>
          </div>
        </div>

        {/* ── Telefone ─────────────────────────────────── */}
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          <span className="text-[11px] font-mono text-muted-foreground">{lead.telefone}</span>
        </div>

        {/* ── Comercial (não-paciente) ─────────────────── */}
        {comercial && (
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded px-1.5 py-0.5 leading-none bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/40">
              🏢 Comercial
            </span>
          </div>
        )}

        {/* ── Origem do lead + Tags clínicas ───────────── */}
        {(() => {
          const orig = getOrigemLead(lead);
          const temTags = tagsMostrar.length > 0;
          return (
            <div className="flex items-center gap-1 flex-wrap">
              {orig ? (
                <span
                  title={`De onde veio: ${orig.label}`}
                  className={cn('inline-flex items-center gap-0.5 text-[9px] font-semibold rounded px-1 py-0.5 leading-none border', orig.cls)}
                >
                  {orig.icon} {orig.label}
                </span>
              ) : (
                <span
                  title="Origem ainda não identificada — a Nathalia vai perguntar"
                  className="text-[9px] rounded px-1 py-0.5 leading-none border border-dashed border-brand-gray/50 text-muted-foreground/60"
                >
                  origem?
                </span>
              )}
              {temTags && <Tag className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground" />}
              {tagsMostrar.map(t => (
                <span
                  key={t}
                  className="text-[9px] rounded px-1 py-0.5 leading-none border bg-brand-cream dark:bg-brand-slate/20 text-muted-foreground border-brand-gray/40"
                >
                  {formatarTag(t)}
                </span>
              ))}
              {tagsVisiveis.length > 3 && (
                <span className="text-[9px] text-muted-foreground">
                  +{tagsVisiveis.length - 3}
                </span>
              )}
            </div>
          );
        })()}

        {/* ── Pagamento (status) ──────────────────────────── */}
        {(() => {
          const valor = lead.valor_consulta ?? 0;
          const pago = lead.total_investido ?? 0;
          // "A pagar" só nas colunas de agendamento; "Pago"/"Sinal" (dinheiro real) sempre.
          const podeApagar = ETAPAS_COM_APAGAR.has(lead.etapa_atual);
          let label: string; let cls: string;
          if (valor > 0 && pago >= valor) { label = `Pago · ${formatarMoeda(pago)}`; cls = 'bg-emerald-600 text-white border-emerald-700'; }
          else if (pago > 0) { label = valor > 0 ? `Sinal · ${formatarMoeda(pago)} de ${formatarMoeda(valor)}` : `Recebido · ${formatarMoeda(pago)}`; cls = 'bg-amber-500 text-white border-amber-600'; }
          else if (valor > 0 && podeApagar) { label = `A pagar · ${formatarMoeda(valor)}`; cls = 'bg-red-600 text-white border-red-700'; }
          else return null;
          return <p className={`text-[10px] font-semibold inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${cls}`}>💰 {label}</p>;
        })()}

        {/* ── Agendamento (dia/hora, sincronizado com o Google) ──────── */}
        {lead.agendamento && (
          <p className="text-[10.5px] font-bold inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-600 text-white border border-blue-700">
            📅 {lead.agendamento.data_br} · {lead.agendamento.hora_br}
            {lead.agendamento.tipo === 'retorno' ? ' · retorno' : lead.agendamento.tipo === 'procedimento' ? ' · procedimento' : ''}
          </p>
        )}

        {/* ── Nota ─────────────────────────────────────── */}
        {lead.nota && !ehNotaAutomatica(lead.nota) && !notaOpen && (
          <p className="text-[10.5px] italic line-clamp-2 text-foreground/80 bg-brand-cream dark:bg-brand-slate/15 border border-brand-gold/25 rounded px-1.5 py-1">
            💬 {lead.nota}
          </p>
        )}

        {/* ── Última mensagem ──────────────────────────── */}
        {lead.ultima_mensagem && !notaOpen && (
          <p className="text-[10.5px] line-clamp-1 text-foreground/80 bg-blue-50 dark:bg-blue-900/15 border border-blue-300/50 dark:border-blue-700/30 rounded px-1.5 py-1">
            📱 {lead.ultima_mensagem}
          </p>
        )}

        {/* ── Editor de nota rápida ─────────────────────── */}
        {notaOpen && (
          <div
            className="space-y-1"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            <textarea
              value={notaText}
              onChange={e => setNotaText(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Escreva uma nota..."
              className="w-full text-[10px] rounded px-1.5 py-1 border border-brand-gray/40 bg-background resize-none outline-none focus:border-brand-gold/60 dark:bg-card"
            />
            <div className="flex gap-1 justify-end">
              <button
                onClick={e => { e.stopPropagation(); setNotaOpen(false); }}
                className="px-1.5 py-0.5 rounded text-[9px] text-muted-foreground hover:text-foreground border border-border bg-background"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNota}
                disabled={notaSaving}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold disabled:opacity-60"
                style={{ backgroundColor: '#c2a650', color: '#0b1a35' }}
              >
                {notaSaving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Save className="h-2.5 w-2.5" />}
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* ── Footer: tempo + dias + SLA + ações ───────── */}
        <div className="flex items-center justify-between pt-1 border-t border-brand-gray/40 dark:border-[#3f4e68]/40">
          <div className="flex items-center gap-1.5">
            <div title={slaPausado ? 'SLA pausado — o Dr está conduzindo este caso' : slaLabel} className={cn('w-2 h-2 rounded-full flex-shrink-0', {
              'bg-slate-400':                 slaPausado,
              'bg-emerald-500':               !slaPausado && slaStatus === 'ok',
              'bg-yellow-500':                !slaPausado && slaStatus === 'atencao',
              'bg-red-500 animate-sla-pulse': !slaPausado && slaStatus === 'atrasado',
            })} />
            <span title="Tempo desde que o lead entrou no CRM" className="text-[10px] text-muted-foreground">
              {formatarTempoRelativo(lead.data_entrada)}
            </span>
            {slaPausado && (
              <span title="O Dr está conduzindo — SLA pausado" className="text-[9px] font-bold text-slate-300 bg-slate-500/25 border border-slate-400/30 rounded px-1">⏸ Eu cuido</span>
            )}
            {!slaPausado && slaStatus === 'atrasado' && (
              <span className="text-[9px] font-black text-brand-gold animate-sla-pulse">SLA!</span>
            )}
            {!slaPausado && slaStatus === 'atencao' && (
              <span className="text-[9px] font-bold text-yellow-500">⚠️</span>
            )}
            {/* Dias parado na etapa atual */}
            <span
              title={dias === 0 ? 'Entrou nesta etapa hoje' : `Parado nesta etapa há ${dias} dia(s)`}
              className="text-[9px] text-muted-foreground/60"
            >
              {dias === 0 ? 'hoje' : `há ${dias}d`}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            {/* Pencil: nota rápida */}
            {!isOverlay && onQuickNota && (
              <button
                onClick={handlePencilClick}
                title="Nota rápida"
                className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] transition-colors opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <Pencil className="h-2.5 w-2.5" />
              </button>
            )}

            {lead.chatwoot_url && (
              <button
                onClick={e => { e.stopPropagation(); window.open(lead.chatwoot_url, '_blank'); }}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors bg-brand-gold/10 hover:bg-brand-gold/25 text-brand-gold"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                Chat
              </button>
            )}
          </div>
        </div>

        {/* ── Botão Paciente Consultou (Pipeline 1: Agendado / Sinal Pago) ── */}
        {mostraBotaoConsultou && (
          <button
            onClick={handleConsultou}
            disabled={consultandoLoading}
            className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-bold transition-all duration-150 disabled:opacity-60"
            style={{ backgroundColor: '#c2a650', color: '#0b1a35' }}
          >
            {consultandoLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Stethoscope className="h-3 w-3" />
            )}
            {consultandoLoading ? 'Processando...' : 'Paciente Consultou'}
          </button>
        )}
      </div>
    </div>
  );
}
