import { useState } from 'react';
import { TagInput } from 'plano';

const wrap: React.CSSProperties = { width: 380 };

export const WithTags = () => {
  const [tags, setTags] = useState<string[]>(['Brutalism', 'Concrete', '1960s']);
  return (
    <div style={wrap}>
      <TagInput tags={tags} setTags={setTags} placeholder="Add a style tag" />
    </div>
  );
};

export const Empty = () => {
  const [tags, setTags] = useState<string[]>([]);
  return (
    <div style={wrap}>
      <TagInput tags={tags} setTags={setTags} placeholder="e.g. Modernism, Cantilever" />
    </div>
  );
};

export const ManyTags = () => {
  const [tags, setTags] = useState<string[]>([
    'Modernism', 'Cantilever', 'Reinforced Concrete', 'Helsinki', 'Aalto', 'Residential',
  ]);
  return (
    <div style={wrap}>
      <TagInput tags={tags} setTags={setTags} placeholder="Add a tag" />
    </div>
  );
};
