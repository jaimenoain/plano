import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SuggestAwardDialog } from "./SuggestAwardDialog";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface SuggestAwardButtonProps {
  recipientType: 'building' | 'person' | 'company';
  recipientId: string;
  recipientName: string;
}

export function SuggestAwardButton({ recipientType, recipientId, recipientName }: SuggestAwardButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  if (!user) return null;

  return (
    <>
      <Button 
        variant="ghost" 
        className="h-auto p-0 text-xs font-bold tracking-widest uppercase text-secondary hover:text-brand-primary transition-colors flex items-center group"
        onClick={() => setIsOpen(true)}
      >
        Suggest an award <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
      </Button>

      <SuggestAwardDialog 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        initialRecipient={{ type: recipientType, id: recipientId, name: recipientName }}
      />
    </>
  );
}
