'use client';

import React, { useState, useEffect } from 'react';
import {
  ExternalLink, ArrowRight, Edit2, Save, Plus, X, Trash2, Loader2, Sparkles,
} from 'lucide-react';
import { Lead, HistoricoMovimentacao, Nota, Financeiro } from '@/lib/types';
import { TarefaNathaliaModal } from './TarefaNathaliaModal';
import { supabase } from '@/lib/supabase';
import { PIPELINE_1, PIPELINE_2, ORIGENS, PRIORIDADES, TAGS } from '@/lib/constants';

// Colunas da aba Procedimentos (proc_status no clinica_ia)
const PROC_COLS: { id: string; nome: string; corHex: string }[] = [
  { id: 'pendente',             nome: 'Em Negociação',       corHex: '#c2a650' },
  { id: 'aguardando_pagamento', nome: 'Aguardando Pagamento', corHex: '#F97316' },
  { id: 'pago',                 nome: 'A Agendar',           corHex: '#06B6D4' },
  { id: 'agendado',             nome: 'Em Tratamento',       corHex: '#10B981' },
  { id: 'concluido',            nome: 'Concluído',           corHex: '#3f4e68' },
];
import {
  calcSLAStatus, formatarData, formatarMoeda, formatarTempoRelativo,
  getOrigemIcon, getEtapa, calcularIdade, formatarTag, cn,
  isSLAPausado, TAG_EU_CUIDO, isComercial, ehTagInterna,
  getOrigemLead, ehNotaAutomatica,
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
  onTransferCard: (leadId: string, pipelineId: 1 | 2, etapa: string) => Promise<void>;
  onDeleteCard?: (lead: Lead) => Promise<void>;
  onDescadastrar?: (lead: Lead, modo: 'sair' | 'apagar') => Promise<void>;
}

type Section = 'detalhes' | 'perfil' | 'poscon' | 'financeiro' | 'historico' | 'notas';

interface PosData {
  retorno_num?:           number | string | null;
  retorno_unidade?:       string | null;
  tem_procedimento?:      boolean | null;
  proc_nome?:             string | null;
  proc_sessoes?:          number | string | null;
  proc_tempo_tratamento?: string | null;
  proc_periodicidade?:    string | null;
  proc_valor_cheio?:      number | string | null;
  proc_valor_piso?:       number | string | null;
  proc_valor_fechado?:    number | string | null;
  proc_status?:           string | null;
  data_retorno_previsto?: string | null;
}

export function LeadModal({ lead: leadProp, onClose, onUpdate, onTransferCard, onDeleteCard, onDescadastrar }: LeadModalProps) {
  // Card "ao vivo": parte do prop e se atualiza sozinho enquanto o modal está aberto
  // (Supabase Realtime + polling de 10s). Evita ver dado defasado depois que o n8n grava.
  const [lead, setLead] = useState<Lead | null>(leadProp);
  // Só reseta para o prop quando ABRE um card diferente (muda o id),
  // assim a busca ao vivo abaixo nunca é revertida por um prop defasado da página.
  useEffect(() => { setLead(leadProp); }, [leadProp?.id]);
  useEffect(() => {
    const id = leadProp?.id;
    if (!id) return;
    let active = true;
    const refetch = async () => {
      const { data } = await supabase.from('leads').select('*').eq('id', id).single();
      if (data && active) setLead(data as Lead);
    };
    refetch(); // busca o estado REAL do banco imediatamente ao abrir (não espera 10s)
    const ch = supabase
      .channel(`lead-modal-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `id=eq.${id}` }, refetch)
      .subscribe();
    const poll = setInterval(refetch, 10000);
    return () => { active = false; supabase.removeChannel(ch); clearInterval(poll); };
  }, [leadProp?.id]);

  const [isEditing,         setIsEditing]         = useState(false);
  const [editData,          setEditData]          = useState<Partial<Lead>>({});
  const [historico,         setHistorico]         = useState<HistoricoMovimentacao[]>([]);
  const [notas,             setNotas]             = useState<Nota[]>([]);
  const [financeiro,        setFinanceiro]        = useState<Financeiro[]>([]);
  const [newNota,           setNewNota]           = useState('');
  const [newNotaAutor,      setNewNotaAutor]      = useState('Atendente');
  const [newPagTipo,        setNewPagTipo]        = useState('sinal');
  const [newPagValor,       setNewPagValor]       = useState('');
  const [newPagMetodo,      setNewPagMetodo]      = useState('pix');
  const [newPagDesc,        setNewPagDesc]         = useState('');
  const [loading,           setLoading]           = useState(false);
  const [activeSection,     setActiveSection]     = useState<Section>('detalhes');
  const [confirmAction,     setConfirmAction]     = useState<null | 'crm' | 'tudo'>(null);
  const [actionLoading,     setActionLoading]     = useState(false);
  const [apagarText,        setApagarText]        = useState('');
  const [movePipeline,      setMovePipeline]      = useState<1 | 2 | 'proc'>(1);
  const [procForm,          setProcForm]          = useState({ nome: '', sessoes: '', periodicidade: 'semanal', valor: '' });
  const [posData,           setPosData]           = useState<PosData>({});
  const [posLoading,        setPosLoading]        = useState(false);
  const [procPagoValor,     setProcPagoValor]     = useState('');
  const [procMetodo,        setProcMetodo]        = useState('pix');
  const [procPagoLoading,   setProcPagoLoading]   = useState(false);
  const [cortesia,          setCortesia]          = useState(false);
  const [cortesiaMotivo,    setCortesiaMotivo]    = useState('');
  const [cortesiaLoading,   setCortesiaLoading]   = useState(false);
  const [tarefaOpen,        setTarefaOpen]        = useState(false);

  // Cobrança via card (texto livre → mesmo motor do Telegram)
  const [showCob,    setShowCob]    = useState(false);
  const [cobTexto,   setCobTexto]   = useState('');
  const [cobLoading, setCobLoading] = useState(false);
  const [cobResult,  setCobResult]  = useState<{ ok: boolean; msg: string } | null>(null);
  // Stand By (Pipeline 2): possível data de retorno p/ paciente indeciso — só lembrete, não cobra/agenda
  const [sbData,    setSbData]    = useState('');
  const [sbLoading, setSbLoading] = useState(false);
  const [sbResult,  setSbResult]  = useState<{ ok: boolean; msg: string } | null>(null);
  // Instruir Nathalia (qualquer card): Dr digita a orientação → IA lê histórico + instrução e conduz a conversa
  const [showInstr,    setShowInstr]    = useState(false);
  const [instrTexto,   setInstrTexto]   = useState('');
  const [instrLoading, setInstrLoading] = useState(false);
  const [instrResult,  setInstrResult]  = useState<{ ok: boolean; msg: string } | null>(null);
  // Pós-consulta (Pipeline 2): agendar retorno / dar alta
  const [retData,    setRetData]    = useState('');
  const [retHora,    setRetHora]    = useState('14:00');
  const [retValor,   setRetValor]   = useState('');
  const [retLoading, setRetLoading] = useState<'' | 'retorno' | 'alta'>('');
  const [retResult,  setRetResult]  = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!lead) return;
    setEditData({});
    setIsEditing(false);
    setActiveSection('detalhes');
    setMovePipeline((lead.pipeline_id ?? 1) === 2 ? 2 : 1);
    // Zera os estados de ação por-card ao trocar de card — senão o resultado de um
    // (ex.: "Nathalia enviou..." de uma paciente) vaza pra outro card (bug reportado).
    setShowInstr(false); setInstrTexto(''); setInstrResult(null); setInstrLoading(false);
    setShowCob(false); setCobTexto(''); setCobResult(null); setCobLoading(false);
    setSbData(''); setSbResult(null); setSbLoading(false);
    setRetResult(null);
    fetchHistorico(lead.id);
    fetchNotas(lead.id);
    fetchFinanceiro(lead.id);
    fetchCortesia(lead.id, lead.telefone);
  }, [lead?.id]);

  // Dados de pós-consulta (vêm de `pacientes` via proxy n8n) — só para cards do Pipeline 2.
  useEffect(() => {
    if (!lead || (lead.pipeline_id ?? 1) !== 2) { setPosData({}); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/leads/${lead.id}/pos-consulta?telefone=${encodeURIComponent(lead.telefone)}`);
        if (res.ok && !cancelled) setPosData((await res.json()) || {});
      } catch { /* silencioso */ }
    })();
    return () => { cancelled = true; };
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

  async function handleAddFinanceiro() {
    if (!lead) return;
    const valorNum = parseFloat(String(newPagValor).replace(',', '.'));
    if (!valorNum || valorNum <= 0) return;
    setLoading(true);
    const res = await fetch('/api/financeiro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: lead.id, tipo: newPagTipo, metodo: newPagMetodo, descricao: newPagDesc, valor: valorNum }),
    });
    if (res.ok) {
      await fetchFinanceiro(lead.id);
      setNewPagValor('');
      setNewPagDesc('');
    }
    setLoading(false);
  }

  async function handleTransferir(pid: 1 | 2, etapaId: string) {
    if (!lead) return;
    setLoading(true);
    await onTransferCard(lead.id, pid, etapaId);
    await fetchHistorico(lead.id);
    setLoading(false);
  }

  async function handleMoverProcedimento(status: string) {
    if (!lead) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/procedimento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: lead.telefone,
          proc_nome: procForm.nome.trim() || lead.procedimento || 'Procedimento',
          proc_sessoes: procForm.sessoes ? parseInt(procForm.sessoes, 10) : null,
          // valor BR: tira ponto de milhar, vírgula vira decimal (6.500 → 6500, 6.500,00 → 6500)
          proc_valor: procForm.valor ? parseFloat(procForm.valor.replace(/\./g, '').replace(',', '.')) : null,
          proc_periodicidade: procForm.periodicidade,
          proc_status: status,
          metodo: procMetodo,
        }),
      });
      // Move de verdade: configurou o procedimento no clinica_ia → remove o card do Pipeline.
      if (res.ok) { await onDeleteCard?.(lead); onClose(); }
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePosConsulta() {
    if (!lead) return;
    setPosLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/pos-consulta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: lead.telefone, ...posData }),
      });
      if (res.ok) setPosData((await res.json()) || posData);
    } finally {
      setPosLoading(false);
    }
  }

  async function handleProcPago() {
    if (!lead) return;
    const v = parseFloat(String(procPagoValor).replace(',', '.'));
    if (!v || v <= 0) return;
    setProcPagoLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/procedimento-pago`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: lead.telefone, valor: v, metodo: procMetodo }),
      });
      if (res.ok) {
        const pc = await fetch(`/api/leads/${lead.id}/pos-consulta?telefone=${encodeURIComponent(lead.telefone)}`);
        if (pc.ok) setPosData((await pc.json()) || {});
        await fetchFinanceiro(lead.id);
        setProcPagoValor('');
      }
    } finally {
      setProcPagoLoading(false);
    }
  }

  async function fetchCortesia(leadId: string, telefone: string) {
    try {
      const res = await fetch(`/api/leads/${leadId}/cortesia?telefone=${encodeURIComponent(telefone)}`);
      if (res.ok) {
        const d = await res.json();
        setCortesia(!!d.proxima_cortesia);
        setCortesiaMotivo(d.cortesia_motivo ?? '');
      }
    } catch { /* silencioso */ }
  }

  async function saveCortesia(ativo: boolean, motivo: string) {
    if (!lead) return;
    setCortesia(ativo); // otimista
    setCortesiaLoading(true);
    try {
      await fetch(`/api/leads/${lead.id}/cortesia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: lead.telefone, ativo, motivo }),
      });
    } finally {
      setCortesiaLoading(false);
    }
  }

  function toggleTag(tag: string) {
    const current = editData.tags ?? lead?.tags ?? [];
    const next = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag];
    setEditData(p => ({ ...p, tags: next }));
  }

  async function handleDescadastrarConfirm() {
    if (!lead || !confirmAction || actionLoading) return;
    setActionLoading(true);
    try {
      if (confirmAction === 'tudo') {
        // Apagar planilha + CRM: tira o card e descadastra no clinica_ia (sai da base/reativação/mensagens).
        if (onDescadastrar) await onDescadastrar(lead, 'apagar');
        else if (onDeleteCard) await onDeleteCard(lead);
      } else {
        // Apagar do CRM: remove só o card; o paciente continua na planilha/base.
        if (onDeleteCard) await onDeleteCard(lead);
        else if (onDescadastrar) await onDescadastrar(lead, 'sair');
      }
      setConfirmAction(null);
      setApagarText('');
      onClose();
    } finally {
      setActionLoading(false);
    }
  }

  const primeiroNome = (lead?.nome ?? '').trim().split(' ')[0] || '';

  if (!lead) return null;

  const etapa     = getEtapa(lead.etapa_atual);
  const slaStatus = calcSLAStatus(lead);
  const slaPausado = isSLAPausado(lead);
  const idade     = calcularIdade(lead.data_nascimento);
  const d         = { ...lead, ...editData };

  // "Eu cuido": liga/desliga a pausa do SLA (o Dr está conduzindo o caso na mão).
  async function toggleEuCuido() {
    const cur = lead!.tags ?? [];
    const novo = slaPausado
      ? cur.filter(t => t.trim().toLowerCase() !== TAG_EU_CUIDO.toLowerCase())
      : [...cur, TAG_EU_CUIDO];
    setLead({ ...lead!, tags: novo });
    await onUpdate(lead!.id, { tags: novo });
  }

  // Colunas-alvo para mover: pipeline escolhido no seletor; esconde a etapa atual quando é o mesmo pipeline
  const pipelineAtualDoLead = (lead.pipeline_id ?? 1) === 2 ? 2 : 1;
  const colunasAlvo = movePipeline === 'proc' ? [] : (movePipeline === 2 ? PIPELINE_2 : PIPELINE_1)
    .filter(e => !(movePipeline === pipelineAtualDoLead && e.id === lead.etapa_atual));

  const totalFinanceiro = financeiro.reduce((acc, f) => acc + (f.valor ?? 0), 0);

  // Toggle de cortesia (mesmo estado nos 2 lugares → sempre sincronizado)
  const cortesiaBox = (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2 dark:bg-amber-950/20 dark:border-amber-800/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">🎁 Próxima consulta de cortesia</p>
          <p className="text-[10px] text-muted-foreground">A IA agenda sem cobrar e avisa que é por conta do Dr. · uso único</p>
        </div>
        <button
          type="button"
          onClick={() => saveCortesia(!cortesia, cortesiaMotivo)}
          disabled={cortesiaLoading}
          aria-pressed={cortesia}
          className={cn('relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors', cortesia ? 'bg-emerald-500' : 'bg-muted-foreground/30')}
        >
          <span className={cn('absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', cortesia && 'translate-x-5')} />
        </button>
      </div>
      {cortesia && (
        <Input
          placeholder="Motivo (opcional): ex. trazer exame, revisão de conduta"
          value={cortesiaMotivo}
          onChange={e => setCortesiaMotivo(e.target.value)}
          onBlur={() => saveCortesia(true, cortesiaMotivo)}
          className="h-7 text-xs"
        />
      )}
    </div>
  );

  async function enviarCobranca(dry: boolean) {
    if (!lead || !cobTexto.trim()) return;
    setCobLoading(true); setCobResult(null);
    try {
      const res = await fetch('/api/cobranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: cobTexto, telefone: lead.telefone, card_id: lead.id, dry_run: dry }),
      });
      const data = await res.json();
      if (data.ok) {
        const termos = Number(data.max_parcelas) > 1
          ? ` em até ${data.max_parcelas}x${data.juros ? '' : ' sem juros'}`
          : ' à vista';
        if (data.enviado === false) {
          setCobResult({ ok: true, msg: `🔍 Simulação: cobraria ${data.paciente} R$ ${data.valor}${termos}. Nada foi enviado.` });
        } else {
          setCobResult({ ok: true, msg: `✅ Cobrança enviada para ${data.paciente}: R$ ${data.valor}${termos}. Link enviado no WhatsApp.` });
          setCobTexto('');
        }
      } else {
        setCobResult({ ok: false, msg: `⚠️ ${data.erro || 'Não consegui cobrar'}` });
      }
    } catch {
      setCobResult({ ok: false, msg: '⚠️ Erro de conexão ao enviar a cobrança.' });
    } finally {
      setCobLoading(false);
    }
  }

  async function agendarRetorno() {
    if (!lead || !/^\d{4}-\d{2}-\d{2}$/.test(retData) || retLoading) return;
    setRetLoading('retorno'); setRetResult(null);
    try {
      const res = await fetch('/api/pos-consulta/agendar-retorno', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: lead.id, telefone: lead.telefone, data: retData, horario: retHora, valor: retValor }),
      });
      const data = await res.json();
      if (data.ok) {
        setRetResult({ ok: true, msg: `✅ Retorno de ${data.paciente || lead.nome} agendado. O card foi pra "Retorno Agendado".` });
        setTimeout(() => onClose(), 1200);
      } else {
        setRetResult({ ok: false, msg: `⚠️ ${data.error || 'Não consegui agendar o retorno.'}` });
      }
    } catch {
      setRetResult({ ok: false, msg: '⚠️ Erro de conexão ao agendar o retorno.' });
    } finally {
      setRetLoading('');
    }
  }

  // Stand By: salva/limpa a possível data de retorno (write-only; o valor atual aparece no briefing diário)
  async function salvarDataRetornoPossivel() {
    if (!lead || sbLoading) return;
    if (sbData && !/^\d{4}-\d{2}-\d{2}$/.test(sbData)) return;
    setSbLoading(true); setSbResult(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/data-retorno`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: lead.telefone, data: sbData }),
      });
      const data = await res.json();
      if (data.ok) {
        setSbResult({ ok: true, msg: sbData
          ? `✅ Possível retorno salvo: ${sbData.split('-').reverse().join('/')}. Aparece no briefing diário.`
          : '✅ Data possível de retorno limpa.' });
      } else {
        setSbResult({ ok: false, msg: `⚠️ ${data.error || 'Não consegui salvar a data.'}` });
      }
    } catch {
      setSbResult({ ok: false, msg: '⚠️ Erro de conexão ao salvar a data.' });
    } finally {
      setSbLoading(false);
    }
  }

  // Instruir Nathalia: envia a orientação; a IA lê o histórico + a instrução e responde à paciente conduzindo a conversa
  async function instruirNathalia() {
    if (!lead || instrLoading) return;
    const txt = instrTexto.trim();
    if (!txt) return;
    setInstrLoading(true); setInstrResult(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/instruir`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: lead.telefone, instrucao: txt }),
      });
      const data = await res.json();
      if (data.ok) {
        setInstrResult({ ok: true, msg: data.pendente
          ? `⏳ ${data.mensagem || ''}`
          : `✅ Nathalia enviou: "${data.mensagem || ''}"` });
        setInstrTexto('');
      } else {
        setInstrResult({ ok: false, msg: `⚠️ ${data.error || 'Não consegui enviar.'}` });
      }
    } catch {
      setInstrResult({ ok: false, msg: '⚠️ Erro de conexão ao instruir a Nathalia.' });
    } finally {
      setInstrLoading(false);
    }
  }

  async function darAlta() {
    if (!lead || retLoading) return;
    setRetLoading('alta'); setRetResult(null);
    try {
      await onUpdate(lead.id, { pipeline_id: 2, etapa_atual: 'Recorrente' });
      setRetResult({ ok: true, msg: '✅ Paciente recebeu alta — virou Recorrente.' });
      setTimeout(() => onClose(), 1000);
    } catch {
      setRetResult({ ok: false, msg: '⚠️ Erro ao dar alta.' });
    } finally {
      setRetLoading('');
    }
  }

  const SECTIONS: { id: Section; label: string }[] = [
    { id: 'detalhes',   label: 'Detalhes' },
    { id: 'perfil',     label: 'Perfil' },
    ...((lead.pipeline_id ?? 1) === 2 ? [{ id: 'poscon' as Section, label: 'Pós-consulta' }] : []),
    { id: 'financeiro', label: `Financeiro${totalFinanceiro > 0 ? ` (${formatarMoeda(totalFinanceiro)})` : ''}` },
    { id: 'historico',  label: 'Histórico' },
    { id: 'notas',      label: `Notas (${notas.length})` },
  ];

  return (
    <Dialog open={!!lead} onOpenChange={(open) => { if (!open) { setLead(null); onClose(); } }}>
      <DialogContent className="lead-modal max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader
          className="flex-shrink-0 hdr-navy-grad"
          style={{ borderBottom: '2px solid #c2a650' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-3 h-3 rounded-full mt-2 flex-shrink-0 ring-2 ring-white/20"
              style={{ backgroundColor: etapa?.corHex ?? '#6B7280' }}
            />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-bold leading-tight text-brand-cream">{lead.nome}</DialogTitle>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className="text-xs text-brand-cream/65">
                  {getOrigemIcon(lead.origem)} {lead.origem}
                </span>
                {(() => {
                  const orig = getOrigemLead(lead);
                  return orig ? (
                    <span
                      title={`De onde veio: ${orig.label}`}
                      className={cn('inline-flex items-center gap-0.5 text-[11px] font-semibold rounded px-1.5 py-0.5 leading-none border', orig.cls)}
                    >
                      {orig.icon} {orig.label}
                    </span>
                  ) : (
                    <span
                      title="Origem ainda não identificada — a Nathalia vai perguntar"
                      className="inline-flex items-center text-[11px] rounded px-1.5 py-0.5 leading-none border border-dashed border-brand-cream/30 text-brand-cream/50"
                    >
                      origem?
                    </span>
                  );
                })()}
                {idade !== null && (
                  <span className="text-xs text-brand-cream/65">· {idade} anos</span>
                )}
                {lead.sexo && (
                  <span className="text-xs text-brand-cream/65">· {lead.sexo}</span>
                )}
                <span className="text-xs text-brand-cream/65">
                  · Pipeline {lead.pipeline_id ?? 1}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isComercial(lead) && (
                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/40 rounded text-xs font-bold">🏢 Comercial</span>
              )}
              {lead.movido_por_ia && (
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs font-bold">AUTO</span>
              )}
              {slaStatus === 'atrasado' && !slaPausado && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-bold animate-sla-pulse">SLA!</span>
              )}
              <button
                onClick={toggleEuCuido}
                title={slaPausado ? 'SLA pausado — você está conduzindo. Clique pra reativar o SLA.' : 'Pausar o SLA: você está conduzindo este caso na mão'}
                className={cn('flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border transition-colors',
                  slaPausado
                    ? 'bg-slate-500/25 text-slate-200 border-slate-400/40 hover:bg-slate-500/35'
                    : 'bg-white/5 text-brand-cream/70 border-white/15 hover:bg-white/10')}
              >
                ⏸ {slaPausado ? 'Eu cuido' : 'Eu cuido?'}
              </button>
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
              <button
                onClick={() => { setShowCob(v => !v); setCobResult(null); }}
                className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded text-xs font-medium transition-colors"
              >
                💸 Cobrar
              </button>
              <button
                onClick={() => setTarefaOpen(true)}
                title="Mandar tarefa pra Nathalia sobre este paciente"
                className="flex items-center gap-1 px-2 py-1 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded text-xs font-medium transition-colors"
              >
                <Sparkles className="h-3 w-3" /> Tarefa
              </button>
            </div>
          </div>
          {tarefaOpen && (
            <TarefaNathaliaModal
              prefill={{ nome: lead.nome, telefone: lead.telefone }}
              onClose={() => setTarefaOpen(false)}
            />
          )}

          {/* Section tabs */}
          <div className="flex gap-0.5 mt-3 flex-wrap">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn('px-3 py-1 rounded text-xs font-medium transition-colors', {
                  'bg-brand-gold text-brand-navy shadow-sm': activeSection === s.id,
                  'text-brand-cream/70 hover:text-brand-cream hover:bg-white/10': activeSection !== s.id,
                })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        {leadProp?.agendamento && (
          <div className="flex-shrink-0 mx-6 mt-2 px-3 py-2 rounded-lg border border-blue-500/40 bg-blue-500/10 text-sm">
            📅 <span className="font-bold text-blue-700 dark:text-blue-400">{leadProp.agendamento.tipo === 'retorno' ? 'Retorno' : leadProp.agendamento.tipo === 'procedimento' ? 'Procedimento' : 'Consulta'} agendada:</span>{' '}
            <span className="font-semibold">{leadProp.agendamento.data_br} às {leadProp.agendamento.hora_br}</span>
          </div>
        )}

        {showCob && (
          <div className="flex-shrink-0 mx-6 mt-1 mb-1 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
            <p className="text-xs font-semibold text-emerald-600">💸 Cobrar {lead.nome?.split(' ')[0]} — a Nathalia envia o link</p>
            <Textarea
              value={cobTexto}
              onChange={e => setCobTexto(e.target.value)}
              placeholder="Ex.: cobra a consulta de R$ 500, pode em até 2x sem juros"
              className="text-sm min-h-[56px]"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => enviarCobranca(true)} disabled={cobLoading || !cobTexto.trim()}>🔍 Simular</Button>
              <Button size="sm" onClick={() => enviarCobranca(false)} disabled={cobLoading || !cobTexto.trim()}>
                {cobLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Enviar cobrança
              </Button>
              <span className="text-[11px] text-muted-foreground">Vai uma mensagem da Nathalia com link de pagamento pro WhatsApp do paciente.</span>
            </div>
            {cobResult && (
              <p className={cn('text-xs p-2 rounded', cobResult.ok ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/15 text-red-500')}>{cobResult.msg}</p>
            )}
          </div>
        )}

        {lead.pipeline_id === 2 && (lead.etapa_atual === 'Pós Consulta' || lead.etapa_atual === 'Agend. Retorno') && (
          <div className="flex-shrink-0 mx-6 mt-1 mb-1 p-3 rounded-lg border border-sky-500/30 bg-sky-500/5 space-y-2">
            <p className="text-xs font-semibold text-foreground">🩺 Pós-consulta — qual o destino de {lead.nome?.split(' ')[0]}?</p>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-0.5">Data do retorno</label>
                <Input type="date" value={retData} onChange={e => setRetData(e.target.value)} className="h-8 text-sm w-36" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-0.5">Hora</label>
                <Input type="time" value={retHora} onChange={e => setRetHora(e.target.value)} className="h-8 text-sm w-24" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-0.5">Valor (R$)</label>
                <Input type="number" value={retValor} onChange={e => setRetValor(e.target.value)} placeholder="opcional" className="h-8 text-sm w-24" />
              </div>
              <Button size="sm" onClick={agendarRetorno} disabled={retLoading !== '' || !/^\d{4}-\d{2}-\d{2}$/.test(retData)} className="text-white" style={{ backgroundColor: '#0EA5E9' }}>
                {retLoading === 'retorno' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Agendar retorno
              </Button>
              <Button size="sm" variant="outline" onClick={darAlta} disabled={retLoading !== ''}>
                {retLoading === 'alta' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Alta / Recorrente
              </Button>
            </div>
            {retResult && (
              <p className={cn('text-xs p-2 rounded', retResult.ok ? 'bg-sky-500/15 text-sky-700 dark:text-sky-400' : 'bg-red-500/15 text-red-500')}>{retResult.msg}</p>
            )}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto pr-3">
          <div className="px-6 pt-5 pb-6 space-y-5">

            {/* ── DETALHES ── */}
            {activeSection === 'detalhes' && (
              <div className="space-y-5">
                {cortesiaBox}
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

                {/* Última objeção — registrada pela Nathalia (aparece em qualquer etapa) */}
                {(() => {
                  const obj = notas.find(n => n.conteudo && n.conteudo.includes('Objeção ('));
                  if (!obj) return null;
                  const cat = (obj.conteudo.match(/Objeção\s*\(([^)]*)\)/) || [])[1] || '';
                  const texto = obj.conteudo.replace(/^.*?Objeção\s*\([^)]*\)\s*:\s*/, '').trim();
                  return (
                    <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/50 bg-amber-500/10">
                      <span className="text-base leading-none mt-0.5">🗣️</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-amber-600">Última objeção{cat ? ` · ${cat}` : ''}</p>
                        <p className="text-sm text-foreground break-words">{texto || obj.conteudo}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Detectada pela Nathalia em {formatarData(obj.criado_em)} · histórico completo na aba Notas</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Instruir a Nathalia — o Dr orienta e a IA conduz a conversa (disponível em qualquer card/momento) */}
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
                  {!showInstr ? (
                    <button
                      onClick={() => setShowInstr(true)}
                      className="w-full flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      💬 Instruir a Nathalia
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-primary block">💬 Instruir a Nathalia</label>
                      <p className="text-[10px] text-muted-foreground">
                        Escreva a orientação. A Nathalia lê o histórico desta conversa + a sua instrução e responde à paciente no WhatsApp, conduzindo a conversa.
                      </p>
                      <textarea
                        value={instrTexto}
                        onChange={e => setInstrTexto(e.target.value)}
                        rows={3}
                        placeholder="Ex.: Diga que consegui encaixá-la quinta às 15h e pergunte se prefere manhã ou tarde."
                        className="w-full text-sm rounded border border-border bg-background p-2 resize-y focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={instruirNathalia}
                          disabled={instrLoading || !instrTexto.trim()}
                          className={cn('px-3 py-1.5 rounded text-xs font-medium transition-colors',
                            instrLoading || !instrTexto.trim() ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90')}
                        >
                          {instrLoading ? 'Nathalia escrevendo…' : 'Enviar orientação'}
                        </button>
                        <button
                          onClick={() => { setShowInstr(false); setInstrResult(null); }}
                          className="px-3 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground"
                        >
                          Fechar
                        </button>
                      </div>
                      {instrResult && (
                        <p className={cn('text-[11px] mt-1 break-words', instrResult.ok ? 'text-emerald-600' : 'text-red-500')}>
                          {instrResult.msg}
                        </p>
                      )}
                    </div>
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
                    <label className="text-xs text-muted-foreground mb-1 block">Valor combinado</label>
                    {isEditing ? (
                      <Input type="number" value={d.valor_consulta ?? lead.valor_consulta} onChange={e => setEditData(p => ({ ...p, valor_consulta: parseFloat(e.target.value) }))} className="h-8 text-sm" />
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-foreground">{formatarMoeda(lead.valor_consulta)}</p>
                        <span className="text-[10px] text-muted-foreground">combinado · não é valor recebido</span>
                        {(() => {
                          const valor = lead.valor_consulta ?? 0;
                          const pago = lead.total_investido ?? 0;
                          // "Ainda não pagou" só nas colunas de agendamento (consulta marcada e não paga).
                          const podeApagar = ['Agendado','Retorno Agendado'].includes(lead.etapa_atual);
                          let label: string; let cls: string;
                          if (valor > 0 && pago >= valor) { label = `Pago integral (${formatarMoeda(pago)})`; cls = 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30'; }
                          else if (pago > 0) { label = valor > 0 ? `Sinal pago: ${formatarMoeda(pago)} de ${formatarMoeda(valor)}` : `Recebido: ${formatarMoeda(pago)}`; cls = 'text-amber-600 bg-amber-500/10 border-amber-500/30'; }
                          else if (valor > 0 && podeApagar) { label = `Ainda não pagou (${formatarMoeda(valor)} a receber)`; cls = 'text-red-500 bg-red-500/10 border-red-500/30'; }
                          else { label = 'Sem pagamento registrado'; cls = 'text-muted-foreground bg-muted/30 border-border'; }
                          return <span className={`mt-1 flex w-fit items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${cls}`}>💰 {label}</span>;
                        })()}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Observação</label>
                  {isEditing ? (
                    <Textarea value={d.nota ?? (ehNotaAutomatica(lead.nota) ? '' : lead.nota)} onChange={e => setEditData(p => ({ ...p, nota: e.target.value }))} rows={3} className="text-sm" />
                  ) : (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2 min-h-[40px]">{(lead.nota && !ehNotaAutomatica(lead.nota)) ? lead.nota : 'Sem observações.'}</p>
                  )}
                </div>

                {isEditing && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">URL Chatwoot</label>
                    <Input value={d.chatwoot_url ?? lead.chatwoot_url} onChange={e => setEditData(p => ({ ...p, chatwoot_url: e.target.value }))} className="h-8 text-sm" placeholder="https://..." />
                  </div>
                )}

                {/* Mover card — escolhe pipeline + coluna (sincroniza com a clínica) */}
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Mover card</label>
                  <div className="inline-flex rounded-md border border-border p-0.5 mb-2">
                    {([1, 2, 'proc'] as const).map(pid => (
                      <button
                        key={String(pid)}
                        onClick={() => setMovePipeline(pid)}
                        className={cn('px-2.5 py-1 rounded text-xs font-medium transition-colors',
                          movePipeline === pid
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground')}
                      >
                        {pid === 'proc' ? 'Procedimentos' : `Pipeline ${pid}${pipelineAtualDoLead === pid ? ' • atual' : ''}`}
                      </button>
                    ))}
                  </div>

                  {movePipeline === 'proc' ? (
                    <div className="space-y-2 rounded-md border border-border p-2.5 bg-muted/30">
                      <p className="text-[11px] text-muted-foreground">Configura o procedimento e move o paciente para a aba <b>Procedimentos</b>. A agenda e a IA acompanham.</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={procForm.nome} onChange={e => setProcForm(p => ({ ...p, nome: e.target.value }))} placeholder="Procedimento (ex: Ozonioterapia)" className="col-span-2 h-8 px-2 rounded-md text-xs border border-border bg-background outline-none" />
                        <input value={procForm.sessoes} onChange={e => setProcForm(p => ({ ...p, sessoes: e.target.value.replace(/\D/g, '') }))} placeholder="Nº de sessões" inputMode="numeric" className="h-8 px-2 rounded-md text-xs border border-border bg-background outline-none" />
                        <select value={procForm.periodicidade} onChange={e => setProcForm(p => ({ ...p, periodicidade: e.target.value }))} className="h-8 px-2 rounded-md text-xs border border-border bg-background outline-none">
                          <option value="semanal">Semanal</option>
                          <option value="quinzenal">Quinzenal</option>
                          <option value="mensal">Mensal</option>
                        </select>
                        <input value={procForm.valor} onChange={e => setProcForm(p => ({ ...p, valor: e.target.value }))} placeholder="Valor total (R$)" inputMode="decimal" className="col-span-2 h-8 px-2 rounded-md text-xs border border-border bg-background outline-none" />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Escolha a coluna de destino:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {PROC_COLS.map(c => (
                          <button
                            key={c.id}
                            onClick={() => handleMoverProcedimento(c.id)}
                            disabled={loading}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors hover:opacity-80 disabled:opacity-50"
                            style={{ borderColor: `${c.corHex}80`, color: c.corHex, backgroundColor: `${c.corHex}15` }}
                          >
                            <ArrowRight className="h-2.5 w-2.5" />{c.nome}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {colunasAlvo.map(e => (
                          <button
                            key={e.id}
                            onClick={() => handleTransferir(movePipeline as 1 | 2, e.id)}
                            disabled={loading}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors hover:opacity-80 disabled:opacity-50"
                            style={{ borderColor: `${e.corHex}80`, color: e.corHex, backgroundColor: `${e.corHex}15` }}
                          >
                            <ArrowRight className="h-2.5 w-2.5" />
                            {e.nome}
                          </button>
                        ))}
                      </div>
                      {movePipeline !== pipelineAtualDoLead && (
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          Transfere para o Pipeline {movePipeline}. Os fluxos da clínica acompanham a mudança automaticamente.
                        </p>
                      )}
                    </>
                  )}
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
                      {(lead.tags ?? []).filter(t => !ehTagInterna(t)).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma tag.</p>
                      ) : (lead.tags ?? []).filter(t => !ehTagInterna(t)).map(tag => (
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

            {/* ── PÓS-CONSULTA ── */}
            {activeSection === 'poscon' && (
              <div className="space-y-5">
                <p className="text-xs text-muted-foreground">
                  Preenchido após a consulta. A IA usa estes dados para conduzir o pós-consulta, o retorno e o procedimento.
                </p>

                {cortesiaBox}

                {/* Tempo de retorno */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tempo de retorno</label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number" min={0}
                      value={posData.retorno_num ?? ''}
                      onChange={e => setPosData(p => ({ ...p, retorno_num: e.target.value }))}
                      className="h-8 text-sm w-24" placeholder="nº"
                    />
                    <Select value={posData.retorno_unidade ?? ''} onValueChange={v => setPosData(p => ({ ...p, retorno_unidade: v }))}>
                      <SelectTrigger className="h-8 text-sm w-40"><SelectValue placeholder="unidade" /></SelectTrigger>
                      <SelectContent>
                        {['dias', 'semanas', 'meses', 'anos'].map(u => (
                          <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {posData.data_retorno_previsto && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Retorno previsto: {formatarData(posData.data_retorno_previsto)}
                    </p>
                  )}
                </div>

                {/* Possível data de retorno — Stand By (paciente indeciso) */}
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                  <label className="text-xs font-medium text-amber-600 mb-1 block">🕒 Possível data de retorno (Stand By)</label>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Para paciente indeciso que ainda não escolheu a data. Só um lembrete — não cria consulta nem cobra. Aparece no briefing diário do Dr. enquanto o card estiver em Stand By. Deixe em branco e salve para limpar.
                  </p>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={sbData}
                      onChange={e => setSbData(e.target.value)}
                      className="h-8 text-sm w-44"
                    />
                    <button
                      onClick={salvarDataRetornoPossivel}
                      disabled={sbLoading || (!!sbData && !/^\d{4}-\d{2}-\d{2}$/.test(sbData))}
                      className={cn('px-3 py-1.5 rounded text-xs font-medium transition-colors',
                        sbLoading ? 'bg-muted text-muted-foreground' : 'bg-amber-500 text-white hover:bg-amber-600')}
                    >
                      {sbLoading ? 'Salvando…' : 'Salvar data'}
                    </button>
                  </div>
                  {sbResult && (
                    <p className={cn('text-[11px] mt-2', sbResult.ok ? 'text-emerald-600' : 'text-red-500')}>
                      {sbResult.msg}
                    </p>
                  )}
                </div>

                {/* Tem procedimento? */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tem procedimento?</label>
                  <div className="inline-flex rounded-md border border-border p-0.5">
                    {([['Não', false], ['Sim', true]] as const).map(([lbl, val]) => (
                      <button
                        key={lbl}
                        onClick={() => setPosData(p => ({ ...p, tem_procedimento: val }))}
                        className={cn('px-3 py-1 rounded text-xs font-medium transition-colors',
                          !!posData.tem_procedimento === val ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Campos do procedimento */}
                {!!posData.tem_procedimento && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
                    <div className="sm:col-span-2">
                      <label className="text-xs text-muted-foreground mb-1 block">Nome do procedimento</label>
                      <Input value={posData.proc_nome ?? ''} onChange={e => setPosData(p => ({ ...p, proc_nome: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Nº de sessões</label>
                      <Input type="number" min={0} value={posData.proc_sessoes ?? ''} onChange={e => setPosData(p => ({ ...p, proc_sessoes: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Tempo de tratamento</label>
                      <Input value={posData.proc_tempo_tratamento ?? ''} onChange={e => setPosData(p => ({ ...p, proc_tempo_tratamento: e.target.value }))} className="h-8 text-sm" placeholder="ex: 10 semanas" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Periodicidade</label>
                      <Input value={posData.proc_periodicidade ?? ''} onChange={e => setPosData(p => ({ ...p, proc_periodicidade: e.target.value }))} className="h-8 text-sm" placeholder="ex: semanal" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Valor cheio (R$)</label>
                      <Input type="number" min={0} step="0.01" value={posData.proc_valor_cheio ?? ''} onChange={e => setPosData(p => ({ ...p, proc_valor_cheio: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Valor piso/mínimo (R$)</label>
                      <Input type="number" min={0} step="0.01" value={posData.proc_valor_piso ?? ''} onChange={e => setPosData(p => ({ ...p, proc_valor_piso: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    {posData.proc_status && posData.proc_status !== 'nenhum' && (
                      <div className="sm:col-span-2 text-[10px] text-muted-foreground">
                        Status do procedimento: <span className="font-semibold capitalize">{posData.proc_status}</span>
                        {posData.proc_valor_fechado ? <span className="text-emerald-600"> · fechado em {formatarMoeda(Number(posData.proc_valor_fechado))}</span> : null}
                      </div>
                    )}

                    {/* Pagamento do procedimento na clínica (item 23) */}
                    <div className="sm:col-span-2 border-t border-border pt-3">
                      {posData.proc_status === 'pago' ? (
                        <p className="text-sm text-emerald-600 font-medium">
                          ✓ Procedimento pago{posData.proc_valor_fechado ? ` — ${formatarMoeda(Number(posData.proc_valor_fechado))} lançado no financeiro` : ''}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground block">Pagamento do procedimento</label>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Input type="number" step="0.01" min="0" placeholder="Valor pago (R$)"
                              value={procPagoValor} onChange={e => setProcPagoValor(e.target.value)} className="h-8 text-sm w-36" />
                            <Select value={procMetodo} onValueChange={setProcMetodo}>
                              <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="Forma" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pix">PIX</SelectItem>
                                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                <SelectItem value="cartao">Cartão</SelectItem>
                                <SelectItem value="convenio">Convênio</SelectItem>
                                <SelectItem value="outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button onClick={handleProcPago} disabled={!procPagoValor || procPagoLoading} size="sm" className="h-8 gap-1 text-xs">
                              {procPagoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                              Marcar pago na clínica
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Marque quando o paciente pagar direto na clínica: lança no financeiro e a Nathalia já chama o paciente pra organizar as sessões. Para cobrar pela IA, deixe o fluxo normal seguir.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Button onClick={handleSavePosConsulta} disabled={posLoading} size="sm" className="gap-1">
                  {posLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Salvar pós-consulta
                </Button>
              </div>
            )}

            {/* ── FINANCEIRO ── */}
            {activeSection === 'financeiro' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Recebido: <span className="text-emerald-600">{formatarMoeda(totalFinanceiro)}</span></p>
                  <span className="text-xs text-muted-foreground">{financeiro.length} registros</span>
                </div>

                {/* Lançar pagamento manual (PIX, dinheiro, cartão na clínica). InfinitePay entra sozinho. */}
                <div className="p-4 border border-border rounded-lg space-y-2 bg-muted/20">
                  <p className="text-xs font-medium">Lançar pagamento recebido</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select value={newPagTipo} onValueChange={setNewPagTipo}>
                      <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sinal">Sinal</SelectItem>
                        <SelectItem value="consulta">Consulta</SelectItem>
                        <SelectItem value="retorno">Retorno</SelectItem>
                        <SelectItem value="procedimento">Procedimento</SelectItem>
                        <SelectItem value="acompanhamento">Acompanhamento</SelectItem>
                        <SelectItem value="exame">Exame</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={newPagMetodo} onValueChange={setNewPagMetodo}>
                      <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="Forma" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                        <SelectItem value="convenio">Convênio</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" step="0.01" min="0" placeholder="Valor (R$)" value={newPagValor} onChange={e => setNewPagValor(e.target.value)} className="h-8 text-xs w-28" />
                    <Input placeholder="Descrição (opcional)" value={newPagDesc} onChange={e => setNewPagDesc(e.target.value)} className="h-8 text-xs flex-1 min-w-[120px]" />
                    <Button onClick={handleAddFinanceiro} disabled={!newPagValor || loading} size="sm" className="h-8 gap-1 text-xs">
                      <Plus className="h-3 w-3" /> Lançar
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Pagamentos via InfinitePay entram automáticos. Use aqui para PIX, dinheiro ou cartão na clínica.</p>
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
            {/* Sair do CRM / Apagar de tudo */}
            {(onDescadastrar || onDeleteCard) && !isEditing && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setConfirmAction('crm'); setApagarText(''); }}
                  className="px-2.5 py-1.5 rounded text-xs font-medium border transition-colors"
                  style={{ color: '#F97316', borderColor: '#F9731640' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F9731612'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = ''; }}
                  title="Remove só o card do CRM; o paciente continua na planilha/base e a Nathalia segue atendendo"
                >
                  Apagar do CRM
                </button>
                <button
                  onClick={() => { setConfirmAction('tudo'); setApagarText(''); }}
                  className="px-2.5 py-1.5 rounded text-xs font-medium border transition-colors"
                  style={{ color: '#EF4444', borderColor: '#EF444440' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#EF444412'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = ''; }}
                  title="Tira do CRM E da planilha (base): sai da reativação e para as mensagens. Irreversível."
                >
                  Apagar planilha + CRM
                </button>
              </div>
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
          <Button onClick={() => { setLead(null); onClose(); }} variant="ghost" size="sm">
            <X className="h-4 w-4 mr-1" /> Fechar
          </Button>
        </div>
      </DialogContent>

      {/* Dialog de confirmação — Sair do CRM / Apagar de tudo */}
      <Dialog open={!!confirmAction} onOpenChange={(o) => { if (!o) { setConfirmAction(null); setApagarText(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmAction === 'tudo' ? 'Apagar planilha + CRM?' : 'Apagar do CRM?'}</DialogTitle>
            <DialogDescription>
              {confirmAction === 'tudo' ? (
                <>
                  <strong>{lead.nome}</strong> sai do <strong>CRM E da planilha</strong> (base de pacientes): para de
                  receber mensagens e sai da reativação. As <strong>consultas e o prontuário são preservados</strong>. Esta ação é{' '}
                  <strong>irreversível</strong>.<br /><br />
                  Para confirmar, digite o primeiro nome: <strong>{primeiroNome}</strong>
                </>
              ) : (
                <>
                  <strong>{lead.nome}</strong> sai <strong>só do CRM</strong> (o card é removido). Continua na
                  planilha/base e a Nathalia segue atendendo — pode voltar ao CRM numa próxima mensagem.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {confirmAction === 'tudo' && (
            <div className="px-6">
              <input
                value={apagarText}
                onChange={e => setApagarText(e.target.value)}
                placeholder={primeiroNome}
                autoFocus
                className="w-full text-sm rounded px-2 py-1.5 border border-border bg-background outline-none focus:border-red-400"
              />
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => { setConfirmAction(null); setApagarText(''); }} variant="outline" size="sm">
              Cancelar
            </Button>
            <button
              onClick={handleDescadastrarConfirm}
              disabled={actionLoading || (confirmAction === 'tudo' && apagarText.trim().toLowerCase() !== primeiroNome.toLowerCase())}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: confirmAction === 'tudo' ? '#EF4444' : '#F97316' }}
            >
              {actionLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2  className="h-3.5 w-3.5" />
              }
              {actionLoading ? 'Processando...' : (confirmAction === 'tudo' ? 'Apagar planilha + CRM' : 'Apagar do CRM')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
