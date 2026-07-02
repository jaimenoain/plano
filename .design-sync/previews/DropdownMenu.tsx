import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  Button,
} from 'plano';
import { Pencil, Share2, FolderPlus, Flag, Trash2 } from 'lucide-react';

const iconStyle: React.CSSProperties = { marginRight: 8, height: 16, width: 16 };

export const RecordActions = () => (
  <DropdownMenu defaultOpen>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">Actions</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" style={{ minWidth: 220 }}>
      <DropdownMenuLabel>Villa Saarinen</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <Pencil style={iconStyle} /> Edit record
        <DropdownMenuShortcut>E</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem>
        <FolderPlus style={iconStyle} /> Add to collection
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Share2 style={iconStyle} /> Share
        <DropdownMenuShortcut>S</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <Flag style={iconStyle} /> Report attribution
      </DropdownMenuItem>
      <DropdownMenuItem style={{ color: 'var(--feedback-error, #b91c1c)' }}>
        <Trash2 style={iconStyle} /> Delete record
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
