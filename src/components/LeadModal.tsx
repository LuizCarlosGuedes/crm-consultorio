'use client';

import React, { useState, useEffect } from 'react';
import { ExternalLink, Clock, Phone, Stethoscope, User, DollarSign, Tag, Edit2, Save, X, MessageSquare, Plus, ArrowRight } from 'lucide-react';
import { Lead, HistoricoMovimentacao, Nota } from '@/lib/types';
import { ETAPAS, ORIGENS, PRIORIDADES } from '@/lib/constants';
import { calcSLAStatus, formatarData, formatarMoeda, formatarTempoRelativo, getOrigemIcon, getEtapa, cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';

interface LeadModalProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Lead>) => Promise<void>;
  onMoveCard: (leadId: string, newStage: string) => Promise<void>;
}

export function LeadModal({ lead, onClose, onUpdate, onMoveCard }: LeadModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Lead>>({});
  const [historico, setHistorico] = useState<HistoricoMovimentacao[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [newNota, setNewNota] = useState('');
  const [newNotaAutor, setNewNotaAutor] = useState('Atendente');
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'detalhes' | 'historico' | 'notas'>('detalhes');

  useEffect(() => {
    if (!lead) return;
    setEditData({});
    setIsEditing(false);
    fetchHistorico(lead.id);
    fetchNotas(lead.id);
  }, [lead?.id]);

  async function fetchHistorico(leadId: string) {
    const res = await fetch(`/api/leads/${leadId}/historico`);
    if (res.ok) setHistorico(await res.json());
  }

  async function fetchNotas(leadId: string) {
    const res = await fetch(`/api/leads/${leadId}/notas`);
    if (res.ok) setNotas(await res.json());
  }

  async function handleSave() {
    if (!lead) return;
    setLoading(true);
    await onUpdate(lead.id, editData);
    setIsEditing(false);
    setLoading(false);
  }

  async function handleAddNota() {
    if (!lead || !newNota.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/leads/${lead.id}/notas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conteudo: newNota, autor: newNotaAutor }),
    });
    if (res.ok) {
      await fetchNotas(lead.id);
      setNewNota('');
    }
    setLoading(false);
  }

  async function handleMoverPara(etapa: string) {
    if (!lead) return;
    setLoading(true);
    await onMoveCard(lead.id, etapa);
    await fetchHistorico(lead.id);
    setLoading(false);
  }

  if (!lead) return null;

  const etapa = getEtapa(lead.etapa_atual);
  const slaStatus = calcSLAStatus(lead);
  const currentEditData = { ...lead, ...editData };

  return (
    <Dialog open={!!lead} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn('w-3 h-3 rounded-full mt-1.5 flex-shrink-0', {
              'bg-red-500 animate-sla-pulse': lead.prioridade === 'urgente',
              'bg-orange-500': lead.prioridade === 'alta',
              'bg-green-500':  lead.prioridade === 'normal',
              'bg-gray-500':   lead.prioridade === 'frio',
            })} />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base leading-tight">{lead.nome}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {getOrigemIcon(lead.origem)} {lead.origem} · Entrou {formatarTempoRelativo(lead.data_entrada)}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {lead.movido_por_ia && (
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs font-bold">AUTO</span>
              )}
              {slaStatus === 'atrasado' && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-bold animate-sla-pulse">SLA!</span>
              )}
              {lead.chatwoot_url && (
                <a
                  href={lead.chatwoot_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs font-medium transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  Chatwoot →
                </a>
              )}
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 mt-3">
            {(['detalhes', 'historico', 'notas'] as const).map(s => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={cn('px-3 py-1 rounded text-xs font-medium transition-colors capitalize', {
                  'bg-primary text-primary-foreground': activeSection === s,
                  'text-muted-foreground hover:text-foreground hover:bg-accent': activeSection !== s,
                })}
              >
                {s === 'historico' ? 'Histórico' : s === 'notas' ? `Notas (${notas.length})` : 'Detalhes'}
              </button>
            ))}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="px-6 pb-4">

            {/* ---- DETALHES ---- */}
            {activeSection === 'detalhes' && (
              <div className="space-y-4">
                {/* Current stage + SLA */}
                <div className={cn('flex items-center gap-2 p-3 rounded-lg border', etapa?.corBg, etapa?.corBorda)}>
                  <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', {
                    'bg-green-500': slaStatus === 'ok',
                    'bg-yellow-500': slaStatus === 'atencao',
                    'bg-red-500 animate-sla-pulse': slaStatus === 'atrasado',
                  })} />
                  <span className={cn('text-sm font-semibold', etapa?.cor)}>{lead.etapa_atual}</span>
                  {lead.sla_vencimento && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      SLA: {formatarTempoRelativo(lead.sla_vencimento)}
                    </span>
                  )}
                </div>

                {/* Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                    {isEditing ? (
                      <Input value={currentEditData.nome ?? ''} onChange={e => setEditData(p => ({ ...p, nome: e.target.value }))} className="h-8 text-sm" />
                    ) : (
                      <p className="text-sm font-medium">{lead.nome}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
                    {isEditing ? (
                      <Input value={currentEditData.telefone ?? ''} onChange={e => setEditData(p => ({ ...p, telefone: e.target.value }))} className="h-8 text-sm" />
                    ) : (
                      <p className="text-sm font-mono">{lead.telefone}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Procedimento</label>
                    {isEditing ? (
                      <Input value={currentEditData.procedimento ?? ''} onChange={e => setEditData(p => ({ ...p, procedimento: e.target.value }))} className="h-8 text-sm" />
                    ) : (
                      <p className="text-sm">{lead.procedimento || '—'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Origem</label>
                    {isEditing ? (
                      <Select value={currentEditData.origem ?? lead.origem} onValueChange={v => setEditData(p => ({ ...p, origem: v as any }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{ORIGENS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm">{getOrigemIcon(lead.origem)} {lead.origem}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Prioridade</label>
                    {isEditing ? (
                      <Select value={currentEditData.prioridade ?? lead.prioridade} onValueChange={v => setEditData(p => ({ ...p, prioridade: v as any }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{PRIORIDADES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm capitalize">{lead.prioridade}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Valor da Consulta</label>
                    {isEditing ? (
                      <Input type="number" value={currentEditData.valor_consulta ?? lead.valor_consulta} onChange={e => setEditData(p => ({ ...p, valor_consulta: parseFloat(e.target.value) }))} className="h-8 text-sm" />
                    ) : (
                      <p className="text-sm font-semibold text-emerald-500">{formatarMoeda(lead.valor_consulta)}</p>
                    )}
                  </div>
                </div>

                {/* Nota */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Observação</label>
                  {isEditing ? (
                    <Textarea value={currentEditData.nota ?? lead.nota} onChange={e => setEditData(p => ({ ...p, nota: e.target.value }))} rows={3} className="text-sm" />
                  ) : (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2 min-h-[40px]">{lead.nota || 'Sem observações.'}</p>
                  )}
                </div>

                {/* URL Chatwoot */}
                {isEditing && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">URL Chatwoot</label>
                    <Input value={currentEditData.chatwoot_url ?? lead.chatwoot_url} onChange={e => setEditData(p => ({ ...p, chatwoot_url: e.target.value }))} className="h-8 text-sm" placeholder="https://..." />
                  </div>
                )}

                {/* Move to stage */}
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Mover para etapa</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ETAPAS.filter(e => e.id !== lead.etapa_atual).map(e => (
                      <button
                        key={e.id}
                        onClick={() => handleMoverPara(e.id)}
                        disabled={loading}
                        className={cn('flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors hover:opacity-80', e.corBg, e.corBorda, e.cor)}
                      >
                        <ArrowRight className="h-2.5 w-2.5" />
                        {e.nome}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Entrada: {formatarData(lead.data_entrada)} · Atualizado: {formatarTempoRelativo(lead.data_atualizacao)}
                </p>
              </div>
            )}

            {/* ---- HISTÓRICO ---- */}
            {activeSection === 'historico' && (
              <div className="space-y-2">
                {historico.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma movimentação registrada.</p>
                ) : historico.map((h, i) => (
                  <div key={h.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn('w-2 h-2 rounded-full mt-1 flex-shrink-0', h.movido_por === 'n8n' ? 'bg-blue-500' : 'bg-primary')} />
                      {i < historico.length - 1 && <div className="w-px flex-1 bg-border mt-1" style={{ minHeight: '20px' }} />}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {h.etapa_origem && (
                          <>
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{h.etapa_origem}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          </>
                        )}
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">{h.etapa_destino}</span>
                        {h.movido_por === 'n8n' && (
                          <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1 py-0.5 rounded font-bold">N8N</span>
                        )}
                      </div>
                      {h.motivo && <p className="text-xs text-muted-foreground mt-0.5">{h.motivo}</p>}
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{formatarData(h.criado_em)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ---- NOTAS ---- */}
            {activeSection === 'notas' && (
              <div className="space-y-3">
                {/* Add note form */}
                <div className="p-3 border border-border rounded-lg space-y-2 bg-muted/20">
                  <Textarea
                    placeholder="Adicionar nova nota..."
                    value={newNota}
                    onChange={e => setNewNota(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Autor"
                      value={newNotaAutor}
                      onChange={e => setNewNotaAutor(e.target.value)}
                      className="h-7 text-xs w-36"
                    />
                    <Button onClick={handleAddNota} disabled={!newNota.trim() || loading} size="sm" className="h-7 gap-1 text-xs">
                      <Plus className="h-3 w-3" /> Adicionar
                    </Button>
                  </div>
                </div>

                {/* Notes list */}
                {notas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota registrada.</p>
                ) : notas.map(n => (
                  <div key={n.id} className="p-3 border border-border rounded-lg bg-muted/10">
                    <p className="text-sm">{n.conteudo}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {n.autor} · {formatarData(n.criado_em)}
                    </p>
                  </div>
                ))}
              </div>
            )}

          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border">
          <div>
            {isEditing ? (
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={loading} size="sm" className="gap-1">
                  <Save className="h-3 w-3" /> Salvar
                </Button>
                <Button onClick={() => { setIsEditing(false); setEditData({}); }} variant="ghost" size="sm">
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="gap-1">
                <Edit2 className="h-3 w-3" /> Editar
              </Button>
            )}
          </div>
          <Button onClick={onClose} variant="ghost" size="sm">Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
