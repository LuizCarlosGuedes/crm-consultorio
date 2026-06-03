'use client';

import React, { useState, useEffect } from 'react';
import {
  ExternalLink, ArrowRight, Edit2, Save, Plus, X, Trash2, Loader2,
} from 'lucide-react';
import { Lead, HistoricoMovimentacao, Nota, Financeiro } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { PIPELINE_1, PIPELINE_2, ORIGENS, PRIORIDADES, TAGS } from '@/lib/constants';
import {
  calcSLAStatus, formatarData, formatarMoeda, formatarTempoRelativo,
  getOrigemIcon, getEtapa, calcularIdade, formatarTag, cn,
} from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
// ScrollArea (Radix) removido: quebrava o scroll no flex; usamos overflow-y-auto nativo.

interface LeadModalProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Lead>) => Promise<void>;
  onMoveCard: (leadId: string, newStage: string) => Promise<void>;
  onDeleteCard?: (lead: Lead) => Promise<void>;
}

type Section = 'detalhes' | 'perfil' | 'financeiro' | 'historico' | 'notas';

export function LeadModal({ lead: leadProp, onClose, onUpdate, onMoveCard, onDeleteCard }: LeadModalProps) {
  // Card "ao vivo": parte do prop e se atualiza sozinho enquanto o modal está aberto
  // (Supabase Realtime + polling de 10s). Evita ver dado defasado depois que o n8n grava.
  const [lead, setLead] = useState<Lead | null>(leadProp);
  // Só reseta para o prop quando ABRE um card diferente (muda o id),
  // assim a busca ao vivo abaixo nunca é revertida por um prop defasado da página.
  useEffect(() => { setLead(leadProp); }, [leadProp?.id]);
  useEffect(() => {
    const id = leadProp?.id;
    if (!id) return;
    const refetch = async () => {
      const { data } = await supabase.from('leads').select('*').eq('id', id).single();
      if (data) setLead(data as Lead);
    };
    refetch(); // busca o estado REAL do banco imediatamente ao abrir (não espera 10s)
    const ch = supabase
      .channel(`lead-modal-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `id=eq.${id}` }, refetch)
      .subscribe();
    const poll = setInterval(refetch, 10000);
    return () => { supabase.removeChannel(ch); clearInterval(poll); };
  }, [leadProp?.id]);

  const [isEditing,         setIsEditing]         = useState(false);
  const [editData,          setEditData]          = useState<Partial<Lead>>({});
  const [historico,         setHistorico]         = useState<HistoricoMovimentacao[]>([]);
  const [notas,             setNotas]             = useState<Nota[]>([]);
  const [financeiro,        setFinanceiro]        = useState<Financeiro[]>([]);
  const [newNota,           setNewNota]           = useState('');
  const [newNotaAutor,      setNewNotaAutor]      = useState('Atendente');
  const [loading,           setLoading]           = useState(false);
  const [activeSection,     setActiveSection]     = useState<Section>('detalhes');
  const [confirmDelete,     setConfirmDelete]     = useState(false);
  const [deleteLoading,     setDeleteLoading]     = useState(false);

  useEffect(() => {
    if (!lead) return;
    setEditData({});
    setIsEditing(false);
    setActiveSection('detalhes');
    fetchHistorico(lead.id);
    fetchNotas(lead.id);
    fetchFinanceiro(lead.id);
  }, [lead?.id]);

  async function fetchHistorico(leadId: string) {
    const res = await fetch(`/api/leads/${leadId}/historico`);
    if (res.ok) setHistorico(await res.json());
  }

  async function fetchNotas(leadId: string) {
    const res = await fetch(`/api/leads/${leadId}/notas`);
    if (res.ok) setNotas(await res.json());
  }

  async function fetchFinanceiro(leadId: string) {
    const res = await fetch(`/api/financeiro?lead_id=${leadId}`);
    if (res.ok) {
      const data = await res.json();
      setFinanceiro(Array.isArray(data) ? data : []);
    }
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

  async function handleMoverPara(etapaId: string) {
    if (!lead) return;
    setLoading(true);
    await onMoveCard(lead.id, etapaId);
    await fetchHistorico(lead.id);
    setLoading(false);
  }

  function toggleTag(tag: string) {
    const current = editData.tags ?? lead?.tags ?? [];
    const next = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag];
    setEditData(p => ({ ...p, tags: next }));
  }

  async function handleDeleteConfirm() {
    if (!lead || !onDeleteCard || deleteLoading) return;
    setDeleteLoading(true);
    try {
      await onDeleteCard(lead);
      setConfirmDelete(false);
      onClose();
    } finally {
      setDeleteLoading(false);
    }
  }

  if (!lead) return null;

  const etapa     = getEtapa(lead.etapa_atual);
  const slaStatus = calcSLAStatus(lead);
  const idade     = calcularIdade(lead.data_nascimento);
  const d         = { ...lead, ...editData };

  // Etapas do mesmo pipeline para mover
  const pipelineDoLead = (lead.pipeline_id ?? 1) === 2 ? PIPELINE_2 : PIPELINE_1;
  const etapasParaMover = pipelineDoLead.filter(e => e.id !== lead.etapa_atual);

  const totalFinanceiro = financeiro.reduce((acc, f) => acc + (f.valor ?? 0), 0);

  const SECTIONS: { id: Section; label: string }[] = [
    { id: 'detalhes',   label: 'Detalhes' },
    { id: 'perfil',     label: 'Perfil' },
    { id: 'financeiro', label: `Financeiro${totalFinanceiro > 0 ? ` (${formatarMoeda(totalFinanceiro)})` : ''}` },
    { id: 'historico',  label: 'Histórico' },
    { id: 'notas',      label: `Notas (${notas.length})` },
  ];

  return (
    <Dialog open={!!lead} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start gap-3">
            <div
              className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: etapa?.corHex ?? '#6B7280' }}
            />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base leading-tight">{lead.nome}</DialogTitle>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {getOrigemIcon(lead.origem)} {lead.origem}
                </span>
                {idade !== null && (
                  <span className="text-xs text-muted-foreground">· {idade} anos</span>
                )}
                {lead.sexo && (
                  <span className="text-xs text-muted-foreground">· {lead.sexo}</span>
                )}
                <span className="text-xs text-muted-foreground">
                  · Pipeline {lead.pipeline_id ?? 1}
                </span>
              </div>
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
                  Chatwoot
                </a>
              )}
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-0.5 mt-3 flex-wrap">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn('px-3 py-1 rounded text-xs font-medium transition-colors', {
                  'bg-primary text-primary-foreground': activeSection === s.id,
                  'text-muted-foreground hover:text-foreground hover:bg-accent': activeSection !== s.id,
                })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-3">
          <div className="px-6 pt-5 pb-6 space-y-5">

            {/* ── DETALHES ── */}
            {activeSection === 'detalhes' && (
              <div className="space-y-5">
                {/* Stage + SLA */}
                <div
                  className="flex items-center gap-2 p-3 rounded-lg border"
                  style={{ borderColor: `${etapa?.corHex}66`, backgroundColor: `${etapa?.corHex}15` }}
                >
                  <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', {
                    'bg-emerald-500':               slaStatus === 'ok',
                    'bg-yellow-500':                slaStatus === 'atencao',
                    'bg-red-500 animate-sla-pulse': slaStatus === 'atrasado',
                  })} />
                  <span className="text-sm font-semibold" style={{ color: etapa?.corHex }}>{lead.etapa_atual}</span>
                  {lead.sla_vencimento && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      SLA: {formatarTempoRelativo(lead.sla_vencimento)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                    {isEditing ? (
                      <Input value={d.nome ?? ''} onChange={e => setEditData(p => ({ ...p, nome: e.target.value }))} className="h-8 text-sm" />
                    ) : (
                      <p className="text-sm font-medium">{lead.nome}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
                    {isEditing ? (
                      <Input value={d.telefone ?? ''} onChange={e => setEditData(p => ({ ...p, telefone: e.target.value }))} className="h-8 text-sm" />
                    ) : (
                      <p className="text-sm font-mono">{lead.telefone}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Procedimento</label>
                    {isEditing ? (
                      <Input value={d.procedimento ?? ''} onChange={e => setEditData(p => ({ ...p, procedimento: e.target.value }))} className="h-8 text-sm" />
                    ) : (
                      <p className="text-sm">{lead.procedimento || '—'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Origem</label>
                    {isEditing ? (
                      <Select value={d.origem ?? lead.origem} onValueChange={v => setEditData(p => ({ ...p, origem: v }))}>
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
                      <Select value={d.prioridade ?? lead.prioridade} onValueChange={v => setEditData(p => ({ ...p, prioridade: v as Lead['prioridade'] }))}>
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
                      <Input type="number" value={d.valor_consulta ?? lead.valor_consulta} onChange={e => setEditData(p => ({ ...p, valor_consulta: parseFloat(e.target.value) }))} className="h-8 text-sm" />
                    ) : (
                      <p className="text-sm font-semibold text-emerald-600">{formatarMoeda(lead.valor_consulta)}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Observação</label>
                  {isEditing ? (
                    <Textarea value={d.nota ?? lead.nota} onChange={e => setEditData(p => ({ ...p, nota: e.target.value }))} rows={3} className="text-sm" />
                  ) : (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2 min-h-[40px]">{lead.nota || 'Sem observações.'}</p>
                  )}
                </div>

                {isEditing && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">URL Chatwoot</label>
                    <Input value={d.chatwoot_url ?? lead.chatwoot_url} onChange={e => setEditData(p => ({ ...p, chatwoot_url: e.target.value }))} className="h-8 text-sm" placeholder="https://..." />
                  </div>
                )}

                {/* Mover para etapa */}
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Mover para etapa</label>
                  <div className="flex flex-wrap gap-1.5">
                    {etapasParaMover.map(e => (
                      <button
                        key={e.id}
                        onClick={() => handleMoverPara(e.id)}
                        disabled={loading}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors hover:opacity-80"
                        style={{ borderColor: `${e.corHex}80`, color: e.corHex, backgroundColor: `${e.corHex}15` }}
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

            {/* ── PERFIL ── */}
            {activeSection === 'perfil' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <label className="text-xs text-muted-foreground mb-1 block">Data de Nascimento</label>
                    {isEditing ? (
                      <Input type="date" value={d.data_nascimento ?? lead.data_nascimento ?? ''} onChange={e => setEditData(p => ({ ...p, data_nascimento: e.target.value }))} className="h-8 text-sm" />
                    ) : (
                      <p className="text-sm break-words">{lead.data_nascimento ? `${lead.data_nascimento} (${idade} anos)` : '—'}</p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs text-muted-foreground mb-1 block">Gênero/Sexo</label>
                    {isEditing ? (
                      <Select
                        value={d.sexo ?? d.genero ?? lead.sexo ?? lead.genero ?? ''}
                        onValueChange={v => setEditData(p => ({ ...p, sexo: v, genero: v }))}
                      >
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Masculino</SelectItem>
                          <SelectItem value="F">Feminino</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm">{lead.genero || lead.sexo || '—'}</p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs text-muted-foreground mb-1 block">Idade</label>
                    <p className="text-sm">
                      {lead.idade != null ? `${lead.idade} anos` : '—'}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs text-muted-foreground mb-1 block">Estado Civil</label>
                    {isEditing ? (
                      <Select value={d.estado_civil ?? lead.estado_civil ?? ''} onValueChange={v => setEditData(p => ({ ...p, estado_civil: v }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          {['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'].map(v => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm break-words">{lead.estado_civil || '—'}</p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs text-muted-foreground mb-1 block">Profissão</label>
                    {isEditing ? (
                      <Input value={d.profissao ?? lead.profissao ?? ''} onChange={e => setEditData(p => ({ ...p, profissao: e.target.value }))} className="h-8 text-sm" />
                    ) : (
                      <p className="text-sm break-words">{lead.profissao || '—'}</p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs text-muted-foreground mb-1 block">CPF</label>
                    {isEditing ? (
                      <Input value={d.cpf ?? lead.cpf ?? ''} onChange={e => setEditData(p => ({ ...p, cpf: e.target.value }))} className="h-8 text-sm" placeholder="000.000.000-00" />
                    ) : (
                      <p className="text-sm font-mono break-all">{lead.cpf || '—'}</p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs text-muted-foreground mb-1 block">RG</label>
                    {isEditing ? (
                      <Input value={d.rg ?? lead.rg ?? ''} onChange={e => setEditData(p => ({ ...p, rg: e.target.value }))} className="h-8 text-sm" />
                    ) : (
                      <p className="text-sm font-mono break-all">{lead.rg || '—'}</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Endereço</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: 'endereco',    label: 'Logradouro',   span: true  },
                      { key: 'numero',      label: 'Número',       span: false },
                      { key: 'complemento', label: 'Complemento',  span: false },
                      { key: 'bairro',      label: 'Bairro',       span: false },
                      { key: 'cep',         label: 'CEP',          span: false },
                      { key: 'cidade',      label: 'Cidade',       span: false },
                      { key: 'estado',      label: 'Estado (UF)',  span: false },
                    ].map(({ key, label, span }) => (
                      <div key={key} className={cn(span ? 'col-span-2' : 'min-w-0')}>
                        <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                        {isEditing ? (
                          <Input
                            value={(d as unknown as Record<string, string>)[key] ?? (lead as unknown as Record<string, string>)[key] ?? ''}
                            onChange={e => setEditData(p => ({ ...p, [key]: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <p className="text-sm break-words">{(lead as unknown as Record<string, string>)[key] || '—'}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Como Conheceu / Indicação</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <label className="text-xs text-muted-foreground mb-1 block">Como conheceu</label>
                      {isEditing ? (
                        <Input value={d.como_conheceu ?? lead.como_conheceu ?? ''} onChange={e => setEditData(p => ({ ...p, como_conheceu: e.target.value }))} className="h-8 text-sm" placeholder="Ex: Indicação amigo" />
                      ) : (
                        <p className="text-sm break-words">{lead.como_conheceu || '—'}</p>
                      )}
                    </div>
                    <div className="min-w-0">
                      <label className="text-xs text-muted-foreground mb-1 block">Foi Indicação?</label>
                      {isEditing ? (
                        <Select value={String(d.foi_indicacao ?? lead.foi_indicacao ?? false)} onValueChange={v => setEditData(p => ({ ...p, foi_indicacao: v === 'true' }))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Sim</SelectItem>
                            <SelectItem value="false">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm">{lead.foi_indicacao ? '✅ Sim' : 'Não'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Tags Clínicas</p>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                      {TAGS.map(tag => {
                        const selected = (d.tags ?? lead.tags ?? []).includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors',
                              selected
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                            )}
                          >
                            {formatarTag(tag)}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {(lead.tags ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma tag.</p>
                      ) : (lead.tags ?? []).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-medium">
                          {formatarTag(tag)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 border-t border-border pt-4">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Consultas</p>
                    <p className="text-lg font-bold">{lead.numero_consultas ?? 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Total Investido</p>
                    <p className="text-sm font-bold text-emerald-600">{formatarMoeda(lead.total_investido ?? 0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Follow-ups</p>
                    <p className="text-lg font-bold">{lead.followup_tentativas ?? 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── FINANCEIRO ── */}
            {activeSection === 'financeiro' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Total: {formatarMoeda(totalFinanceiro)}</p>
                  <span className="text-xs text-muted-foreground">{financeiro.length} registros</span>
                </div>
                {financeiro.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro financeiro.</p>
                ) : financeiro.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{f.descricao || f.tipo}</p>
                      <p className="text-[10px] text-muted-foreground">{f.tipo} · {formatarData(f.data_registro)}</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">{formatarMoeda(f.valor)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── HISTÓRICO ── */}
            {activeSection === 'historico' && (
              <div className="space-y-3">
                {historico.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma movimentação.</p>
                ) : historico.map((h, i) => (
                  <div key={h.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn('w-2 h-2 rounded-full mt-1 flex-shrink-0', h.movido_por === 'n8n' ? 'bg-blue-500' : 'bg-primary')} />
                      {i < historico.length - 1 && <div className="w-px flex-1 bg-border mt-1" style={{ minHeight: 20 }} />}
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
                        {h.movido_por === 'n8n' ? (
                          <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1 py-0.5 rounded font-bold">Nathalia IA</span>
                        ) : (
                          <span className="text-[9px] bg-brand-gold/10 border border-brand-gold/30 px-1 py-0.5 rounded font-bold" style={{ color: '#c2a650' }}>Dr. Luiz</span>
                        )}
                      </div>
                      {h.motivo && <p className="text-xs text-muted-foreground mt-0.5">{h.motivo}</p>}
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{formatarData(h.criado_em)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── NOTAS ── */}
            {activeSection === 'notas' && (
              <div className="space-y-5">
                <div className="p-4 border border-border rounded-lg space-y-3 bg-muted/20">
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
                {notas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota.</p>
                ) : notas.map(n => (
                  <div key={n.id} className="p-3 border border-border rounded-lg bg-muted/10">
                    <p className="text-sm">{n.conteudo}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{n.autor} · {formatarData(n.criado_em)}</p>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Excluir Lead */}
            {onDeleteCard && !isEditing && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-2.5 py-1.5 rounded text-xs font-medium border transition-colors"
                style={{ color: '#EF4444', borderColor: '#EF444440' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#EF444412';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#EF444470';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#EF444440';
                }}
              >
                Excluir Lead
              </button>
            )}
            {/* Editar / Salvar */}
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
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="h-4 w-4 mr-1" /> Fechar
          </Button>
        </div>
      </DialogContent>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir lead?</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{lead.nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setConfirmDelete(false)} variant="outline" size="sm">
              Cancelar
            </Button>
            <button
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: '#EF4444' }}
            >
              {deleteLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2  className="h-3.5 w-3.5" />
              }
              {deleteLoading ? 'Excluindo...' : 'Excluir'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
