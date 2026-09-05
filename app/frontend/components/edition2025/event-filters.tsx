import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
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

const HEADING =
  'border-4 border-black bg-black p-2 font-mono text-sm font-bold uppercase tracking-wider text-white lg:p-3 lg:text-lg';
const OPTION =
  'block w-full transform border-2 border-black px-3 py-2 text-left font-mono text-xs font-bold uppercase tracking-wider transition-all lg:px-4 lg:py-3 lg:text-sm';
const SELECTED = '-translate-y-1 bg-primary text-black shadow-[4px_4px_0px_0px_#000]';
const UNSELECTED =
  'bg-white text-black hover:-translate-y-1 hover:bg-primary hover:shadow-[4px_4px_0px_0px_#000]';
const MORE =
  'border-2 border-black bg-transparent p-1.5 font-mono text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-black hover:text-white lg:p-2';

function toggle<T>(item: T, selected: T[], onChange: (items: T[]) => void) {
  onChange(selected.includes(item) ? selected.filter((i) => i !== item) : [...selected, item]);
}

// Topics / start time / types, a collapsible panel on phones and always open on desktop.
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
  const [showMoreFormats, setShowMoreFormats] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsOpen(desktop.matches);
    sync();
    desktop.addEventListener('change', sync);
    return () => desktop.removeEventListener('change', sync);
  }, []);

  const visibleTopics = showMoreTopics ? topics : topics.slice(0, 6);
  const visibleFormats = showMoreFormats ? formats : formats.slice(0, 6);

  return (
    <div className="flex flex-col gap-4 lg:gap-8">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full transform items-center justify-between border-4 border-black bg-primary p-3 font-mono text-base font-black uppercase tracking-wider text-black shadow-[4px_4px_0px_0px_#000] transition-all hover:shadow-[6px_6px_0px_0px_#000] lg:pointer-events-none lg:p-4 lg:text-2xl"
      >
        <span>FILTERS</span>
        <ChevronDown className={`h-5 w-5 transition-transform lg:hidden ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-4 lg:gap-8">
          <div className="flex flex-col gap-2 lg:gap-4">
            <h3 className={HEADING}>TOPICS</h3>
            <div className="flex flex-col gap-2 lg:gap-3">
              {visibleTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggle(topic, selectedTopics, onTopicsChange)}
                  className={`${OPTION} ${selectedTopics.includes(topic) ? SELECTED : UNSELECTED}`}
                >
                  {topic}
                </button>
              ))}
              {topics.length > 6 && (
                <button type="button" onClick={() => setShowMoreTopics(!showMoreTopics)} className={MORE}>
                  {showMoreTopics ? '- SEE LESS' : '+ SEE MORE'}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:gap-4">
            <h3 className={HEADING}>START TIME</h3>
            <div className="flex flex-col gap-2 lg:gap-3">
              {START_TIMES.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => toggle(time, selectedStartTimes, onStartTimesChange)}
                  className={`${OPTION} ${selectedStartTimes.includes(time) ? SELECTED : UNSELECTED}`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:gap-4">
            <h3 className={HEADING}>TYPES</h3>
            <div className="flex flex-col gap-2 lg:gap-3">
              {visibleFormats.map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => toggle(format, selectedFormats, onFormatsChange)}
                  className={`${OPTION} ${selectedFormats.includes(format) ? SELECTED : UNSELECTED}`}
                >
                  {FORMAT_LABELS[format]}
                </button>
              ))}
              {formats.length > 6 && (
                <button type="button" onClick={() => setShowMoreFormats(!showMoreFormats)} className={MORE}>
                  {showMoreFormats ? '- SEE LESS' : '+ SEE MORE'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
