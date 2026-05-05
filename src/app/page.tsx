'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Lead, Pendencia } from '@/lib/types';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { ListView } from '@/components/ListView';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { LeadModal } from '@/components/LeadModal';
import { AddLeadModal } from '@/components/AddLeadModal';
import { PendenciasView } from '@/components/PendenciasView';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Loader2 } from 'lucide-react';

type ViewType = 'kanban' | 'lista' | 'dashboard' | 'configuracoes' | 'pendencias';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'crm' | 'dashboard' | 'pendencias'>('crm');
  const [view, setView] = useState<ViewType>('kanban');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrioridade, setFilterPrioridade] = useState('todos');
  const [showAll, setShowAll] = useState(false);

  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      })
      .subscribe();

    const pendenciasChannel = supabase
      .channel('pendencias-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pendencias' }, () => {
        fetchPendencias();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(pendenciasChannel);
    };
  }, [fetchLeads, fetchPendencias]);

  // Sync tab & view
  function handleTabChange(tab: 'crm' | 'dashboard' | 'pendencias') {
    setActiveTab(tab);
    if (tab === 'dashboard') setView('dashboard');
    else if (tab === 'pendencias') setView('pendencias');
    else if (view === 'dashboard' || view === 'pendencias') setView('kanban');
  }

  function handleViewChange(v: ViewType) {
    setView(v);
    if (v === 'dashboard') setActiveTab('dashboard');
    else if (v === 'pendencias') setActiveTab('pendencias');
    else setActiveTab('crm');
  }

  function handleResolvePendencia(id: string) {
    setPendencias(prev => prev.filter(p => p.id !== id));
  }

  const filteredLeads = showAll
    ? leads
    : leads.filter(lead => {
        const matchesSearch =
          searchTerm === '' ||
          lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.telefone.includes(searchTerm);
        const matchesPrioridade =
          filterPrioridade === 'todos' || lead.prioridade === filterPrioridade;
        return matchesSearch && matchesPrioridade;
      });

  async function handleMoveCard(leadId: string, newStage: string) {
    // Optimistic update
    setLeads(prev =>
      prev.map(l => l.id === leadId ? { ...l, etapa_atual: newStage, movido_por_ia: false } : l)
    );

    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa_atual: newStage, movido_por: 'humano' }),
    });

    if (!res.ok) fetchLeads(); // Revert on error

    // Update selected lead if it was moved
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

  async function handleAddLead(data: {
    nome: string; telefone: string; origem: string; procedimento: string;
    prioridade: string; nota: string; valor_consulta: number; chatwoot_url: string;
  }) {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await fetchLeads();
  }

  const headerTopH = activeTab === 'crm' ? 101 : 53;

  return (
    <div className="min-h-screen bg-background">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterPrioridade={filterPrioridade}
        onFilterChange={setFilterPrioridade}
        showAll={showAll}
        onShowAllToggle={() => setShowAll(p => !p)}
        onAddLead={() => setShowAddModal(true)}
        onRefresh={fetchLeads}
        pendenciasCount={pendencias.length}
      />

      <Sidebar
        view={view}
        onViewChange={handleViewChange}
        topOffset={headerTopH}
        pendenciasCount={pendencias.length}
      />

      <main
        className="pl-12 overflow-hidden"
        style={{ paddingTop: `${headerTopH}px` }}
      >
        {loading && view !== 'pendencias' ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando leads...</span>
          </div>
        ) : (
          <>
            {/* Kanban */}
            {view === 'kanban' && (
              <div className="overflow-hidden p-3" style={{ height: `calc(100vh - ${headerTopH}px)` }}>
                <KanbanBoard
                  leads={filteredLeads}
                  onMoveCard={handleMoveCard}
                  onCardClick={setSelectedLead}
                />
              </div>
            )}

            {/* Lista */}
            {view === 'lista' && (
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {filteredLeads.length} leads {!showAll && searchTerm && `para "${searchTerm}"`}
                  </p>
                </div>
                <ListView leads={filteredLeads} onCardClick={setSelectedLead} />
              </div>
            )}

            {/* Dashboard */}
            {view === 'dashboard' && (
              <div className="p-4">
                <Dashboard leads={leads} />
              </div>
            )}

            {/* Pendências */}
            {view === 'pendencias' && (
              <PendenciasView
                pendencias={pendencias}
                loading={pendenciasLoading}
                onResolve={handleResolvePendencia}
                onRefresh={fetchPendencias}
              />
            )}

            {/* Configurações */}
            {view === 'configuracoes' && (
              <div className="p-4 max-w-2xl">
                <h2 className="text-lg font-semibold mb-4">Configurações</h2>
                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Webhooks N8N</h3>
                    <div className="space-y-2 text-xs text-muted-foreground font-mono bg-muted/50 rounded p-3">
                      <p>POST /api/webhook/n8n/novo-lead</p>
                      <p>POST /api/webhook/n8n/mover-card</p>
                      <p>POST /api/webhook/n8n/atualizar-card</p>
                      <p>POST /api/webhook/n8n/adicionar-nota</p>
                      <p>POST /api/webhook/n8n/resolver-pendencia</p>
                      <p>GET  /api/webhook/n8n/pipeline</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Use o header: <span className="font-mono">Authorization: Bearer {'<'}WEBHOOK_SECRET_TOKEN{'>'}</span>
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">Status do Sistema</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-muted-foreground">Supabase conectado · {leads.length} leads na base · {pendencias.length} pendências abertas</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <LeadModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdate={handleUpdateLead}
        onMoveCard={handleMoveCard}
      />

      <AddLeadModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddLead}
      />
    </div>
  );
}
