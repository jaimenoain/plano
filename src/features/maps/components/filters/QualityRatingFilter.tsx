import React from 'react';
import { Slider } from '@/components/ui/slider';

interface QualityRatingFilterProps {
  value: number;
  onChange: (value: number) => void;
}

export function QualityRatingFilter({ value, onChange }: QualityRatingFilterProps) {
  return (
    <div className="w-full space-y-3">
      <Slider
        defaultValue={[0]}
        max={3}
        step={1}
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>All</span>
        <span>●</span>
        <span>●●</span>
        <span>●●●</span>
      </div>
    </div>
  );
}
