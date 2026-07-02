import { useEffect, useRef } from 'react';
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem,
  ContextMenuLabel, ContextMenuSeparator, ContextMenuShortcut,
} from 'plano';
import { Pencil, Star, Share2, Trash2 } from 'lucide-react';

const ico: React.CSSProperties = { marginRight: 8, height: 16, width: 16 };

// ContextMenu opens on right-click only (no `open` prop). To show the REAL
// menu content (not a lookalike), we dispatch a native contextmenu event on the
// trigger after mount so the actual ContextMenuContent renders open.
export const PinActions = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: r.left + 48, clientY: r.top + 26,
    }));
  }, []);
  return (
    <div style={{ padding: 12 }}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={ref}
            style={{
              border: '1px dashed var(--border-default)',
              padding: '22px 16px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: 13,
              width: 260,
            }}
          >
            Villa Saarinen — right-click for actions
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>Villa Saarinen</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem><Pencil style={ico} />Edit record<ContextMenuShortcut>⌘E</ContextMenuShortcut></ContextMenuItem>
          <ContextMenuItem><Star style={ico} />Save to favorites</ContextMenuItem>
          <ContextMenuItem><Share2 style={ico} />Share pin</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem style={{ color: 'var(--feedback-destructive)' }}>
            <Trash2 style={ico} />Remove pin
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
};
