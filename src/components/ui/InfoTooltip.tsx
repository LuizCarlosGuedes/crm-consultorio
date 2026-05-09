'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

interface InfoTooltipProps {
  text: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function InfoTooltip({ text, side = 'top' }: InfoTooltipProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="flex-shrink-0 focus:outline-none"
          onClick={e => e.stopPropagation()}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <HelpCircle
            className="h-3.5 w-3.5 transition-colors"
            style={{ color: hovered ? '#c2a650' : '#3f4e68' }}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[240px] text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
