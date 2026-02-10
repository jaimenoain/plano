import React from 'react';
import { SegmentedControl } from '@/components/ui/segmented-control';

interface QualityRatingFilterProps {
  value: number;
  onChange: (value: number) => void;
}

export function QualityRatingFilter({ value, onChange }: QualityRatingFilterProps) {
  // Convert numeric value to string for SegmentedControl
  const stringValue = value.toString();

  const handleValueChange = (newValue: string) => {
    onChange(parseInt(newValue, 10));
  };

  const options = [
    { label: 'All', value: '0' },
    { label: 'Good', value: '1' },
    { label: 'Great', value: '2' },
    { label: 'Exceptional', value: '3' },
  ];

  return (
    <SegmentedControl
      options={options}
      value={stringValue}
      onValueChange={handleValueChange}
      className="w-full"
    />
  );
}
