import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { formatMonth } from '@/lib/data';

interface TimeSliderProps {
  months: string[];
  index: number;
  onChange: (index: number) => void;
}

const PLAY_INTERVAL_MS = 150;

export function TimeSlider({ months, index, onChange }: TimeSliderProps) {
  const [playing, setPlaying] = useState(false);
  const atEnd = index >= months.length - 1;

  useEffect(() => {
    if (!playing) {
      return;
    }
    const timer = setInterval(() => {
      if (index >= months.length - 1) {
        setPlaying(false);
      } else {
        onChange(index + 1);
      }
    }, PLAY_INTERVAL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [playing, index, months.length, onChange]);

  const month = months[index];

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface-1/90 px-3 py-2 backdrop-blur">
      <button
        type="button"
        onClick={() => {
          if (atEnd) {
            onChange(0);
          }
          setPlaying((p) => !p);
        }}
        className="text-fg-muted transition-colors hover:text-fg"
        aria-label={playing ? 'Pause replay' : 'Play replay'}
      >
        {playing ? (
          <Pause className="size-4" strokeWidth={1.5} />
        ) : (
          <Play className="size-4" strokeWidth={1.5} />
        )}
      </button>
      <input
        type="range"
        min={0}
        max={Math.max(0, months.length - 1)}
        value={index}
        onChange={(event) => {
          setPlaying(false);
          onChange(Number(event.target.value));
        }}
        className="w-44 accent-[#f59e0b] sm:w-64"
        aria-label="Month"
      />
      <span className="w-20 text-right font-mono text-xs text-fg-muted">
        {month ? formatMonth(month) : ''}
      </span>
    </div>
  );
}
