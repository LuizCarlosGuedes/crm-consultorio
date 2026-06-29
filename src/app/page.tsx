'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Lead, Pendencia, Retorno, Descadastrado } from '@/lib/types';
import { PIPELINE_1, PIPELINE_2 } from '@/lib/constants';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { ListView } from '@/components/ListView';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { LeadModal } from '@/components/LeadModal';
import { AddLeadModal } from '@/components/AddLeadModal';
import { PendenciasView } from '@/components/PendenciasView';
import { RetornosView } from '@/components/RetornosView';
import { DescadastradosView } from '@/components/DescadastradosView';
import { ProcedimentosView, Procedimento } from '@/components/ProcedimentosView';
import { ConteudoView, Conteudo } from '@/components/ConteudoView';
import { AgendaView } from '@/components/AgendaView';
import { ReativacaoView } from '@/components/ReativacaoView';
import { Header, ActiveTab, ViewMode } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab]       = useState<ActiveTab>('pipeline1');
  const [viewMode,  setViewMode]        = useState<ViewMode>('kanban');
  const [leads,     setLeads]           = useState<Lead[]>([]);
  const [agendaMap, setAgendaMap]       = useState<Record<string, { data_br: string; hora_br: string; tipo: string }>>({});
  const [loading,   setLoading]         = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [filterPrioridade, setFilterPrioridade] = useState('todos');
  const [filterEtapa,      setFilterEtapa]      = useState('todas');
  const [pendencias, setPendencias]     = useState<Pendencia[]>([]);
  const [pendenciasLoading, setPendenciasLoading] = useState(false);
  const [retornos, setRetornos]         = useState<Retorno[]>([]);
  const [retornosLoading, setRetornosLoading] = useState(false);
  const [descadastrados, setDescadastrados] = useState<Descadastrado[]>([]);
  const [descadastradosLoading, setDescadastradosLoading] = useState(false);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [procedimentosLoading, setProcedimentosLoading] = useState(false);
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [conteudosLoading, setConteudosLoading] = useState(false);

  const fetchLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('data_entrada', { ascending: false });
    if (!error && data) setLeads(data as Lead[]);
    setLoading(false);
    // Próximos agendamentos (clinica_ia, sincronizado com Google) → mostra dia/hora no card.
    try {
      const r = await fetch('/api/agendamentos', { cache: 'no-store' });
      const j = await r.json();
      const m: Record<string, { data_br: string; hora_br: string; tipo: string }> = {};
      for (const a of (j.agendamentos ?? [])) {
        if (a?.tel8) m[a.tel8] = { data_br: a.data_br, hora_br: a.hora_br, tipo: a.tipo };
      }
      setAgendaMap(m);
    } catch { /* sem agendamentos */ }
  }, []);

  const fetchPendencias = useCallback(async () => {
    setPendenciasLoading(true);
    const { data, error } = await supabase
      .from('pendencias')
      .select('*')
      .eq('status', 'pendente')
      .order('created_at', { ascending: false });
    if (!error && data) setPendencias(data as Pendencia[]);
    setPendenciasLoading(false);
  }, []);

  const fetchRetornos = useCallback(async () => {
    setRetornosLoading(true);
    const { data, error } = await supabase
      .from('retornos')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setRetornos(data as Retorno[]);
    setRetornosLoading(false);
  }, []);

  const fetchDescadastrados = useCallback(async () => {
    setDescadastradosLoading(true);
    try {
      const res = await fetch('/api/descadastrados');
      if (res.ok) {
        const data = await res.json();
        setDescadastrados(data as Descadastrado[]);
      }
    } finally {
      setDescadastradosLoading(false);
    }
  }, []);

  const fetchProcedimentos = useCallback(async () => {
    setProcedimentosLoading(true);
    try {
      const res = await fetch('/api/procedimentos');
      if (res.ok) setProcedimentos(await res.json() as Procedimento[]);
    } finally {
      setProcedimentosLoading(false);
    }
  }, []);

  const fetchConteudos = useCallback(async () => {
    setConteudosLoading(true);
    try {
      const res = await fetch('/api/conteudo');
      if (res.ok) setConteudos(await res.json() as Conteudo[]);
    } finally {
      setConteudosLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchPendencias();
    fetchRetornos();
    fetchDescadastrados();
    fetchProcedimentos();
    fetchConteudos();

    const leadsChannel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
      .subscribe();

    const pendenciasChannel = supabase
      .channel('pendencias-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pendencias' }, fetchPendencias)
      .subscribe();

    const retornosChannel = supabase
      .channel('retornos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'retornos' }, fetchRetornos)
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(pendenciasChannel);
      supabase.removeChannel(retornosChannel);
    };
  }, [fetchLeads, fetchPendencias, fetchRetornos, fetchDescadastrados, fetchProcedimentos, fetchConteudos]);

  // Reset filtro de etapa ao trocar de pipeline
  function handleTabChange(tab: ActiveTab) {
    setActiveTab(tab);
    setFilterEtapa('todas');
  }

  function filtrarLeads(allLeads: Lead[], pipelineId: 1 | 2): Lead[] {
    const doPipeline = allLeads.filter(l => {
      const pid = l.pipeline_id ?? 1;
      return pid === pipelineId;
    });

    return doPipeline.filter(lead => {
      const matchesSearch =
        searchTerm === '' ||
        lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.telefone.includes(searchTerm);
      const matchesPrioridade =
        filterPrioridade === 'todos' || lead.prioridade === filterPrioridade;
      const matchesEtapa =
        filterEtapa === 'todas' || lead.etapa_atual === filterEtapa;
      return matchesSearch && matchesPrioridade && matchesEtapa;
    });
  }

  async function handleMoveCard(leadId: string, newStage: string) {
    setLeads(prev =>
      prev.map(l => l.id === leadId ? { ...l, etapa_atual: newStage, movido_por_ia: false } : l)
    );

    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa_atual: newStage, movido_por: 'humano' }),
    });

    if (!res.ok) fetchLeads();

    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, etapa_atual: newStage } : null);
    }
  }

  // Move o card para QUALQUER pipeline + coluna (P1↔P2). Passa pela rota PUT,
  // que sincroniza pacientes.etapa_crm via o bridge (os fluxos acompanham sozinhos).
  async function handleTransferCard(leadId: string, pipelineId: 1 | 2, etapa: string) {
    setLeads(prev =>
      prev.map(l => l.id === leadId ? { ...l, pipeline_id: pipelineId, etapa_atual: etapa, movido_por_ia: false } : l)
    );
    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_id: pipelineId, etapa_atual: etapa, movido_por: 'humano' }),
    });
    if (!res.ok) fetchLeads();
    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, pipeline_id: pipelineId, etapa_atual: etapa } : null);
    }
  }

  async function handleUpdateLead(id: string, data: Partial<Lead>) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));

    await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (selectedLead?.id === id) {
      setSelectedLead(prev => prev ? { ...prev, ...data } : null);
    }
  }

  async function handleAddLead(data: Record<string, unknown>) {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, pipeline_id: activeTab === 'pipeline2' ? 2 : 1 }),
    });
    await fetchLeads();
  }

  async function handleDeleteCard(lead: Lead) {
    setLeads(prev => prev.filter(l => l.id !== lead.id));
    await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
  }

  async function handleDescadastrar(lead: Lead, modo: 'sair' | 'apagar') {
    setLeads(prev => prev.filter(l => l.id !== lead.id));
    await fetch(`/api/leads/${lead.id}/descadastrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modo }),
    });
    fetchDescadastrados();
  }

  async function handleQuickNota(lead: Lead, nota: string) {
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, nota } : l));
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nota }),
    });
    if (selectedLead?.id === lead.id) {
      setSelectedLead(prev => prev ? { ...prev, nota } : null);
    }
  }

  async function handlePacienteConsultou(lead: Lead) {
    // Move o MESMO card para o Pipeline 2 / "Compareceu" (update-in-place).
    // Mantém o id do card → o vínculo pacientes.crm_card_id continua válido, o histórico
    // segue contínuo e a rota PUT já dispara o bridge crm-sync-etapa (etapa_crm='Compareceu').
    setLeads(prev =>
      prev.map(l => l.id === lead.id ? { ...l, pipeline_id: 2, etapa_atual: 'Compareceu', movido_por_ia: false } : l)
    );

    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_id: 2, etapa_atual: 'Compareceu', movido_por: 'humano' }),
    });
    if (!res.ok) { fetchLeads(); return; }

    // Webhook da clínica: marca compareceu_at + consulta REALIZADO (WF12) e abre o pós-consulta.
    fetch('https://n8n.drluizguedes.com.br/webhook/paciente-consultou', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_id:         lead.id,
        nome:            lead.nome,
        telefone:        lead.telefone,
        pipeline_origem: 1,
      }),
    }).catch(() => {});

    await fetchLeads();
  }

  function handleResolvePendencia(id: string) {
    setPendencias(prev => prev.filter(p => p.id !== id));
  }

  function handleUpdateRetorno(id: string, updates: Partial<Retorno>) {
    setRetornos(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  const activePipeline = activeTab === 'pipeline2' ? 2 : 1;
  const activeStages   = activeTab === 'pipeline2' ? PIPELINE_2 : PIPELINE_1;
  const leadsComAgenda = leads.map(l => {
    const t8 = (l.telefone || '').replace(/\D/g, '').slice(-8);
    return { ...l, agendamento: (t8 && agendaMap[t8]) || null };
  });
  const leadsP1        = filtrarLeads(leadsComAgenda, 1);
  const leadsP2        = filtrarLeads(leadsComAgenda, 2);
  const filteredLeads  = activePipeline === 2 ? leadsP2 : leadsP1;

  const showFilterBar = activeTab === 'pipeline1' || activeTab === 'pipeline2';
  const headerH       = showFilterBar ? 101 : 53;
  const effectiveView: ViewMode = viewMode; // mobile/tablet usam o kanban (colunas) igual ao desktop

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        pendenciasCount={pendencias.length}
      />
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterPrioridade={filterPrioridade}
        onFilterChange={setFilterPrioridade}
        filterEtapa={filterEtapa}
        onFilterEtapaChange={setFilterEtapa}
        stages={activeStages}
        onAddLead={() => setShowAddModal(true)}
        onRefresh={fetchLeads}
        pendenciasCount={pendencias.length}
      />

      <main
        className="overflow-hidden"
        style={{ paddingTop: `${headerH}px`, paddingLeft: 60 }}
      >
        {loading && (activeTab === 'pipeline1' || activeTab === 'pipeline2') ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando leads...</span>
          </div>
        ) : (
          <>
            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <div className="p-4">
                <Dashboard leads={leads} />
              </div>
            )}

            {/* Pipeline 1 — Captação */}
            {activeTab === 'pipeline1' && effectiveView === 'kanban' && (
              <div className="overflow-hidden px-3 pt-3" style={{ height: `calc(100vh - ${headerH}px)` }}>
                <KanbanBoard
                  stages={PIPELINE_1}
                  leads={leadsP1}
                  onMoveCard={handleMoveCard}
                  onCardClick={setSelectedLead}
                  onPacienteConsultou={handlePacienteConsultou}
                  onQuickNota={handleQuickNota}
                  pendencias={pendencias}
                  onResolvePendencia={handleResolvePendencia}
                />
              </div>
            )}
            {activeTab === 'pipeline1' && effectiveView === 'lista' && (
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  {filteredLeads.length} leads no Pipeline 1
                </p>
                <ListView leads={leadsP1} onCardClick={setSelectedLead} />
              </div>
            )}

            {/* Pipeline 2 — Pacientes Ativos */}
            {activeTab === 'pipeline2' && effectiveView === 'kanban' && (
              <div className="overflow-hidden px-3 pt-3" style={{ height: `calc(100vh - ${headerH}px)` }}>
                <KanbanBoard
                  stages={PIPELINE_2}
                  leads={leadsP2}
                  onMoveCard={handleMoveCard}
                  onCardClick={setSelectedLead}
                  onQuickNota={handleQuickNota}
                />
              </div>
            )}
            {activeTab === 'pipeline2' && effectiveView === 'lista' && (
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  {filteredLeads.length} leads no Pipeline 2
                </p>
                <ListView leads={leadsP2} onCardClick={setSelectedLead} />
              </div>
            )}

            {/* Procedimentos */}
            {activeTab === 'procedimentos' && (
              <ProcedimentosView
                procedimentos={procedimentos}
                loading={procedimentosLoading}
                onRefresh={fetchProcedimentos}
              />
            )}

            {/* Agenda */}
            {activeTab === 'agenda' && <AgendaView />}

            {/* Base de Reativação */}
            {activeTab === 'reativacao' && <ReativacaoView />}

            {/* Conteúdo */}
            {activeTab === 'conteudo' && (
              <ConteudoView
                conteudos={conteudos}
                loading={conteudosLoading}
                onRefresh={fetchConteudos}
              />
            )}

            {/* Pendências */}
            {activeTab === 'pendencias' && (
              <PendenciasView
                pendencias={pendencias}
                loading={pendenciasLoading}
                onResolve={handleResolvePendencia}
                onRefresh={fetchPendencias}
              />
            )}

            {/* Retornos */}
            {activeTab === 'retornos' && (
              <RetornosView
                retornos={retornos}
                loading={retornosLoading}
                onRefresh={fetchRetornos}
                onUpdate={handleUpdateRetorno}
              />
            )}

            {/* Descadastrados */}
            {activeTab === 'descadastrados' && (
              <DescadastradosView
                descadastrados={descadastrados}
                loading={descadastradosLoading}
                onRefresh={fetchDescadastrados}
              />
            )}
          </>
        )}
      </main>

      <LeadModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdate={handleUpdateLead}
        onTransferCard={handleTransferCard}
        onDeleteCard={handleDeleteCard}
        onDescadastrar={handleDescadastrar}
      />

      <AddLeadModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddLead}
        defaultPipelineId={activePipeline}
      />
    </div>
  );
}
