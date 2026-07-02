import { Avatar, AvatarImage, AvatarFallback } from 'plano';

const row: React.CSSProperties = { display: 'flex', gap: 16, alignItems: 'center' };
const label: React.CSSProperties = { fontSize: 13, color: 'var(--text-secondary)' };

export const WithImage = () => (
  <div style={row}>
    <Avatar>
      <AvatarImage
        src="https://i.pravatar.cc/80?img=13"
        alt="Eero Saarinen"
      />
      <AvatarFallback>ES</AvatarFallback>
    </Avatar>
    <span style={label}>Eero Saarinen — Curator</span>
  </div>
);

export const Fallbacks = () => (
  <div style={row}>
    <Avatar>
      <AvatarFallback style={{ fontSize: 13, color: 'var(--text-primary)' }}>ES</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback style={{ fontSize: 13, color: 'var(--text-primary)' }}>AA</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback style={{ fontSize: 13, color: 'var(--text-primary)' }}>MvR</AvatarFallback>
    </Avatar>
  </div>
);

export const Sizes = () => (
  <div style={{ ...row }}>
    <Avatar style={{ height: 24, width: 24 }}>
      <AvatarFallback style={{ fontSize: 10, color: 'var(--text-primary)' }}>ES</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback style={{ fontSize: 13, color: 'var(--text-primary)' }}>ES</AvatarFallback>
    </Avatar>
    <Avatar style={{ height: 56, width: 56 }}>
      <AvatarFallback style={{ fontSize: 18, color: 'var(--text-primary)' }}>ES</AvatarFallback>
    </Avatar>
  </div>
);
