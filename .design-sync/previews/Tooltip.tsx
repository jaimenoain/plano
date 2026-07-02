import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  Button,
} from 'plano';

export const SaveTooltip = () => (
  <div style={{ paddingTop: 60, paddingLeft: 60 }}>
  <TooltipProvider>
    <Tooltip defaultOpen>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm">Save building</Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        Add Villa Saarinen to your saved records
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
  </div>
);
