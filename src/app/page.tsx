'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Lead, Pendencia } from '@/lib/types';
import { PIPELINE_1, PIPELINE_2 } from '@/lib/constants';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { ListView } from '@/components/ListView';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { LeadModal } from '@/components/LeadModal';
import { AddLeadModal } from '@/components/AddLeadModal';
import { PendenciasView } from '@/components/PendenciasView';
import { Header, ActiveTab, ViewMode } from '@/components/Header';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab]       = useState<ActiveTab>('pipeline1');
  const [viewMode,  setViewMode]        = useState<ViewMode>('kanban');
  const [leads,     setLeads]           = useState<Lead[]>([]);
  const [loading,   setLoading]         = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [filterPrioridade, setFilterPrioridade] = useState('todos');
  const [filterEtapa,      setFilterEtapa]      = useState('todas');
  const [showAll,  setShowAll]          = useState(false);
  const [pendencias, setPendencias]     = useState<Pendencia[]>([]);
  const [pendenciasLoading, setPendenciasLoading] = useState(false);

  const fetchLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('data_entrada', { ascending: false });
    if (!error && data) setLeads(data as Lead[]);
    setLoading(false);
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

  useEffect(() => {
    fetchLeads();
    fetchPendencias();

    const leadsChannel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
      .subscribe();

    const pendenciasChannel = supabase
      .channel('pendencias-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pendencias' }, fetchPendencias)
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(pendenciasChannel);
    };
  }, [fetchLeads, fetchPendencias]);

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

    if (showAll) return doPipeline;

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
    // 1. Cria novo card no Pipeline 2 na etapa Compareceu
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome:         lead.nome,
        telefone:     lead.telefone,
        origem:       lead.origem,
        procedimento: lead.procedimento,
        prioridade:   lead.prioridade,
        nota:         lead.nota,
        tags:         lead.tags,
        chatwoot_url: lead.chatwoot_url,
        pipeline_id:  2,
        etapa_atual:  'Compareceu',
        movido_por:   'humano',
      }),
    });

    // 2. Remove o card original do Pipeline 1
    await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });

    // 3. Dispara webhook N8N
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

  const activePipeline = activeTab === 'pipeline2' ? 2 : 1;
  const activeStages   = activeTab === 'pipeline2' ? PIPELINE_2 : PIPELINE_1;
  const leadsP1        = filtrarLeads(leads, 1);
  const leadsP2        = filtrarLeads(leads, 2);
  const filteredLeads  = activePipeline === 2 ? leadsP2 : leadsP1;

  const showFilterBar = activeTab === 'pipeline1' || activeTab === 'pipeline2';
  const headerH       = showFilterBar ? 101 : 53;

  return (
    <div className="min-h-screen bg-background">
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
        showAll={showAll}
        onShowAllToggle={() => setShowAll(p => !p)}
        onAddLead={() => setShowAddModal(true)}
        onRefresh={fetchLeads}
        pendenciasCount={pendencias.length}
      />

      <main
        className="pl-0 overflow-hidden"
        style={{ paddingTop: `${headerH}px` }}
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
            {activeTab === 'pipeline1' && viewMode === 'kanban' && (
              <div className="overflow-hidden px-3 pt-3" style={{ height: `calc(100vh - ${headerH}px)` }}>
                <KanbanBoard
                  stages={PIPELINE_1}
                  leads={leadsP1}
                  onMoveCard={handleMoveCard}
                  onCardClick={setSelectedLead}
                  onPacienteConsultou={handlePacienteConsultou}
                  onQuickNota={handleQuickNota}
                />
              </div>
            )}
            {activeTab === 'pipeline1' && viewMode === 'lista' && (
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  {filteredLeads.length} leads no Pipeline 1
                </p>
                <ListView leads={leadsP1} onCardClick={setSelectedLead} />
              </div>
            )}

            {/* Pipeline 2 — Pacientes Ativos */}
            {activeTab === 'pipeline2' && viewMode === 'kanban' && (
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
            {activeTab === 'pipeline2' && viewMode === 'lista' && (
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  {filteredLeads.length} leads no Pipeline 2
                </p>
                <ListView leads={leadsP2} onCardClick={setSelectedLead} />
              </div>
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
          </>
        )}
      </main>

      <LeadModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdate={handleUpdateLead}
        onMoveCard={handleMoveCard}
        onDeleteCard={handleDeleteCard}
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
