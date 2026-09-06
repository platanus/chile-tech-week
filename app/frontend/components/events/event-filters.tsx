import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { EventFormat } from '@/types';
import { START_TIMES, type StartTime } from './dates';
import { FORMAT_LABELS } from './formats';

interface EventFiltersProps {
  topics: string[];
  selectedTopics: string[];
  onTopicsChange: (topics: string[]) => void;
  selectedStartTimes: StartTime[];
  onStartTimesChange: (times: StartTime[]) => void;
  formats: EventFormat[];
  selectedFormats: EventFormat[];
  onFormatsChange: (formats: EventFormat[]) => void;
}

function toggle<T>(item: T, selected: T[], onChange: (items: T[]) => void) {
  onChange(selected.includes(item) ? selected.filter((i) => i !== item) : [...selected, item]);
}

function Option({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-sm border px-3 py-1.5 text-left font-mono text-[11px] uppercase tracking-[.12em] transition-colors',
        active
          ? 'border-primary bg-primary text-white'
          : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="label text-muted-foreground">{title}</h3>
      <div className="flex flex-wrap gap-2 lg:flex-col lg:items-start">{children}</div>
    </div>
  );
}

// Temas / horario / tipo: a collapsible panel on phones, always open on desktop.
export function EventFilters({
  topics,
  selectedTopics,
  onTopicsChange,
  selectedStartTimes,
  onStartTimesChange,
  formats,
  selectedFormats,
  onFormatsChange,
}: EventFiltersProps) {
  const [showMoreTopics, setShowMoreTopics] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsOpen(desktop.matches);
    sync();
    desktop.addEventListener('change', sync);
    return () => desktop.removeEventListener('change', sync);
  }, []);

  const visibleTopics = showMoreTopics ? topics : topics.slice(0, 8);
  const active = selectedTopics.length + selectedStartTimes.length + selectedFormats.length;

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between border-b border-border pb-3 font-display text-sm font-extrabold uppercase tracking-[-0.02em] lg:pointer-events-none"
        aria-expanded={isOpen}
      >
        <span>
          Filtros
          {active > 0 && <span className="ml-2 text-primary">{active}</span>}
        </span>
        <ChevronDown className={cn('size-4 transition-transform lg:hidden', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-8">
          {active > 0 && (
            <button
              type="button"
              onClick={() => {
                onTopicsChange([]);
                onStartTimesChange([]);
                onFormatsChange([]);
              }}
              className="label self-start text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          )}

          {topics.length > 0 && (
            <Section title="Temas">
              {visibleTopics.map((topic) => (
                <Option key={topic} active={selectedTopics.includes(topic)} onClick={() => toggle(topic, selectedTopics, onTopicsChange)}>
                  {topic}
                </Option>
              ))}
              {topics.length > 8 && (
                <button type="button" onClick={() => setShowMoreTopics(!showMoreTopics)} className="label text-muted-foreground hover:text-foreground">
                  {showMoreTopics ? '− Ver menos' : '+ Ver más'}
                </button>
              )}
            </Section>
          )}

          <Section title="Horario">
            {START_TIMES.map((time) => (
              <Option key={time} active={selectedStartTimes.includes(time)} onClick={() => toggle(time, selectedStartTimes, onStartTimesChange)}>
                {time}
              </Option>
            ))}
          </Section>

          {formats.length > 0 && (
            <Section title="Tipo">
              {formats.map((format) => (
                <Option key={format} active={selectedFormats.includes(format)} onClick={() => toggle(format, selectedFormats, onFormatsChange)}>
                  {FORMAT_LABELS[format]}
                </Option>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
