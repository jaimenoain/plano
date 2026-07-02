import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableCaption } from 'plano';

const rows: [string, string, string, string][] = [
  ['Villa Saarinen', 'Aino Aalto', 'Helsinki', '1962'],
  ['Barbican Estate', 'Chamberlin, Powell & Bon', 'London', '1976'],
  ['Salk Institute', 'Louis Kahn', 'La Jolla', '1965'],
  ['Casa das Canoas', 'Oscar Niemeyer', 'Rio de Janeiro', '1953'],
];

const mono: React.CSSProperties = { fontFamily: 'Space Mono, monospace' };

export const Buildings = () => (
  <Table>
    <TableCaption>Recently added to the archive</TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead>Building</TableHead>
        <TableHead>Architect</TableHead>
        <TableHead>City</TableHead>
        <TableHead style={{ textAlign: 'right' }}>Year</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map(([b, a, c, y]) => (
        <TableRow key={b}>
          <TableCell style={{ fontWeight: 500 }}>{b}</TableCell>
          <TableCell style={{ color: 'var(--text-secondary)' }}>{a}</TableCell>
          <TableCell style={{ color: 'var(--text-secondary)' }}>{c}</TableCell>
          <TableCell style={{ textAlign: 'right', ...mono }}>{y}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export const WithSelection = () => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Building</TableHead>
        <TableHead>Architect</TableHead>
        <TableHead style={{ textAlign: 'right' }}>Year</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.slice(0, 3).map(([b, a, , y], i) => (
        <TableRow key={b} data-state={i === 1 ? 'selected' : undefined}>
          <TableCell style={{ fontWeight: 500 }}>{b}</TableCell>
          <TableCell style={{ color: 'var(--text-secondary)' }}>{a}</TableCell>
          <TableCell style={{ textAlign: 'right', ...mono }}>{y}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
