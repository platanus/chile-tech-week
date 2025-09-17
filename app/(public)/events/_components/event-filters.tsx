'use client';

import { useState } from 'react';
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
    <div className="space-y-8">
      <h2 className="transform border-4 border-black bg-primary p-4 font-black font-mono text-2xl text-black uppercase tracking-wider shadow-[4px_4px_0px_0px_theme(colors.black)]">
        FILTERS
      </h2>

      {/* Topics */}
      <div className="space-y-4">
        <h3 className="border-4 border-black bg-black p-3 font-bold font-mono text-black text-lg text-white uppercase tracking-wider">
          TOPICS
        </h3>
        <div className="space-y-3">
          {visibleTopics.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() =>
                toggleSelection(topic, selectedTopics, onTopicsChange)
              }
              className={`block w-full transform border-2 border-black px-4 py-3 text-left font-bold font-mono text-sm uppercase tracking-wider transition-all ${
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
              className="border-2 border-black bg-transparent p-2 font-bold font-mono text-black text-xs uppercase tracking-wider transition-colors hover:bg-black hover:text-white"
            >
              {showMoreTopics ? '- SEE LESS' : '+ SEE MORE'}
            </Button>
          )}
        </div>
      </div>

      {/* Start time */}
      <div className="space-y-4">
        <h3 className="border-4 border-black bg-black p-3 font-bold font-mono text-black text-lg text-white uppercase tracking-wider">
          START TIME
        </h3>
        <div className="space-y-3">
          {START_TIMES.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() =>
                toggleSelection(time, selectedStartTimes, onStartTimesChange)
              }
              className={`block w-full transform border-2 border-black px-4 py-3 text-left font-bold font-mono text-sm uppercase tracking-wider transition-all ${
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
      <div className="space-y-4">
        <h3 className="border-4 border-black bg-black p-3 font-bold font-mono text-black text-lg text-white uppercase tracking-wider">
          TYPES
        </h3>
        <div className="space-y-3">
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
              className={`block w-full transform border-2 border-black px-4 py-3 text-left font-bold font-mono text-sm uppercase tracking-wider transition-all ${
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
              className="border-2 border-black bg-transparent p-2 font-bold font-mono text-black text-xs uppercase tracking-wider transition-colors hover:bg-black hover:text-white"
            >
              {showMoreTypes ? '- SEE LESS' : '+ SEE MORE'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
