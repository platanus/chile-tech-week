'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/src/components/ui/button';

interface EventFiltersProps {
  topics: string[];
  selectedTopics: string[];
  onTopicsChange: (topics: string[]) => void;
  selectedStartTimes: string[];
  onStartTimesChange: (times: string[]) => void;
  types: string[];
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
}

const START_TIMES = ['Morning', 'Midday / Noon', 'Afternoon', 'Evening'];

const formatEventType = (format: string) => {
  switch (format) {
    case 'breakfast_brunch_lunch':
      return 'Breakfast / Brunch / Lunch';
    case 'pitch_event_demo_day':
      return 'Pitch Event / Demo Day';
    case 'panel_fireside_chat':
      return 'Panel event or fireside chat';
    case 'roundtable_workshop':
      return 'Roundtable / Workshop';
    case 'happy_hour':
      return 'Happy Hour';
    default:
      return format
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  }
};

export function EventFilters({
  topics,
  selectedTopics,
  onTopicsChange,
  selectedStartTimes,
  onStartTimesChange,
  types,
  selectedTypes,
  onTypesChange,
}: EventFiltersProps) {
  const [showMoreTopics, setShowMoreTopics] = useState(false);
  const [showMoreTypes, setShowMoreTypes] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Auto-open on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSelection = <T,>(
    item: T,
    selected: T[],
    onChange: (items: T[]) => void,
  ) => {
    if (selected.includes(item)) {
      onChange(selected.filter((i) => i !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  const visibleTopics = showMoreTopics ? topics : topics.slice(0, 6);
  const visibleTypes = showMoreTypes ? types : types.slice(0, 6);

  return (
    <div className="space-y-4 lg:space-y-8">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full transform items-center justify-between border-4 border-black bg-primary p-3 font-black font-mono text-base uppercase tracking-wider shadow-[4px_4px_0px_0px_theme(colors.black)] transition-all hover:shadow-[6px_6px_0px_0px_theme(colors.black)] lg:pointer-events-none lg:p-4 lg:text-2xl"
      >
        <span>FILTERS</span>
        <ChevronDown
          className={`h-5 w-5 transition-transform lg:hidden ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="space-y-4 lg:space-y-8">
          {/* Filter sections */}

          {/* Topics */}
          <div className="space-y-2 lg:space-y-4">
            <h3 className="border-4 border-black bg-black p-2 font-bold font-mono text-sm text-white uppercase tracking-wider lg:p-3 lg:text-lg">
              TOPICS
            </h3>
            <div className="space-y-2 lg:space-y-3">
              {visibleTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() =>
                    toggleSelection(topic, selectedTopics, onTopicsChange)
                  }
                  className={`block w-full transform border-2 border-black px-3 py-2 text-left font-bold font-mono text-xs uppercase tracking-wider transition-all lg:px-4 lg:py-3 lg:text-sm ${
                    selectedTopics.includes(topic)
                      ? '-translate-y-1 bg-primary text-black shadow-[4px_4px_0px_0px_theme(colors.black)]'
                      : 'hover:-translate-y-1 bg-white text-black hover:bg-primary hover:shadow-[4px_4px_0px_0px_theme(colors.black)]'
                  }`}
                >
                  {topic}
                </button>
              ))}
              {topics.length > 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMoreTopics(!showMoreTopics)}
                  className="border-2 border-black bg-transparent p-1.5 font-bold font-mono text-black text-xs uppercase tracking-wider transition-colors hover:bg-black hover:text-white lg:p-2"
                >
                  {showMoreTopics ? '- SEE LESS' : '+ SEE MORE'}
                </Button>
              )}
            </div>
          </div>

          {/* Start time */}
          <div className="space-y-2 lg:space-y-4">
            <h3 className="border-4 border-black bg-black p-2 font-bold font-mono text-sm text-white uppercase tracking-wider lg:p-3 lg:text-lg">
              START TIME
            </h3>
            <div className="space-y-2 lg:space-y-3">
              {START_TIMES.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() =>
                    toggleSelection(
                      time,
                      selectedStartTimes,
                      onStartTimesChange,
                    )
                  }
                  className={`block w-full transform border-2 border-black px-3 py-2 text-left font-bold font-mono text-xs uppercase tracking-wider transition-all lg:px-4 lg:py-3 lg:text-sm ${
                    selectedStartTimes.includes(time)
                      ? '-translate-y-1 bg-primary text-black shadow-[4px_4px_0px_0px_theme(colors.black)]'
                      : 'hover:-translate-y-1 bg-white text-black hover:bg-primary hover:shadow-[4px_4px_0px_0px_theme(colors.black)]'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Types */}
          <div className="space-y-2 lg:space-y-4">
            <h3 className="border-4 border-black bg-black p-2 font-bold font-mono text-sm text-white uppercase tracking-wider lg:p-3 lg:text-lg">
              TYPES
            </h3>
            <div className="space-y-2 lg:space-y-3">
              {visibleTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    toggleSelection(
                      formatEventType(type),
                      selectedTypes,
                      onTypesChange,
                    )
                  }
                  className={`block w-full transform border-2 border-black px-3 py-2 text-left font-bold font-mono text-xs uppercase tracking-wider transition-all lg:px-4 lg:py-3 lg:text-sm ${
                    selectedTypes.includes(formatEventType(type))
                      ? '-translate-y-1 bg-primary text-black shadow-[4px_4px_0px_0px_theme(colors.black)]'
                      : 'hover:-translate-y-1 bg-white text-black hover:bg-primary hover:shadow-[4px_4px_0px_0px_theme(colors.black)]'
                  }`}
                >
                  {formatEventType(type)}
                </button>
              ))}
              {types.length > 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMoreTypes(!showMoreTypes)}
                  className="border-2 border-black bg-transparent p-1.5 font-bold font-mono text-black text-xs uppercase tracking-wider transition-colors hover:bg-black hover:text-white lg:p-2"
                >
                  {showMoreTypes ? '- SEE LESS' : '+ SEE MORE'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
