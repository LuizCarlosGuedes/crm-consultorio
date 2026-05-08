'use client';

import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Lead, Stage } from '@/lib/types';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

interface KanbanBoardProps {
  stages: Stage[];
  leads: Lead[];
  onMoveCard: (leadId: string, newStage: string) => Promise<void>;
  onCardClick: (lead: Lead) => void;
}

export function KanbanBoard({ stages, leads, onMoveCard, onCardClick }: KanbanBoardProps) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find(l => l.id === event.active.id);
    setActiveLead(lead ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);
    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    const isStageId = stages.some(s => s.id === overId);
    let targetStage: string;

    if (isStageId) {
      targetStage = overId;
    } else {
      const targetLead = leads.find(l => l.id === overId);
      if (!targetLead) return;
      targetStage = targetLead.etapa_atual;
    }

    const sourceLead = leads.find(l => l.id === leadId);
    if (!sourceLead || sourceLead.etapa_atual === targetStage) return;

    await onMoveCard(leadId, targetStage);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 px-1">
        {stages.map(stage => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={leads.filter(l => l.etapa_atual === stage.id)}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {activeLead ? (
          <KanbanCard lead={activeLead} onClick={() => {}} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
