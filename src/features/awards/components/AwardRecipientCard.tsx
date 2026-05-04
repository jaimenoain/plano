import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AwardRecipientDTO } from "../types/awards";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl } from "@/utils/url";

interface AwardRecipientCardProps {
  recipient: AwardRecipientDTO;
  className?: string;
  showAwardName?: boolean;
}

export function AwardRecipientCard({ recipient, className, showAwardName = false }: AwardRecipientCardProps) {
  const isWinner = recipient.outcome === 'winner';

  const renderBadge = () => {
    const outcomeLabel = recipient.outcome.replace('_', ' ');
    return (
      <Badge
        variant={isWinner ? "default" : "secondary"}
        className={cn(
          "uppercase tracking-wider text-[10px] font-bold px-2 py-0.5 h-auto",
          isWinner 
            ? "bg-surface-card text-text-primary border border-brand-primary" 
            : "bg-surface-muted text-text-secondary border-none"
        )}
      >
        {outcomeLabel}
      </Badge>
    );
  };

  const renderBuilding = () => {
    if (!recipient.building) return null;
    const imageUrl = getBuildingImageUrl(recipient.building.heroImageUrl);

    return (
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0 w-12 h-12 rounded-sm overflow-hidden bg-surface-muted border border-border-default">
          {imageUrl ? (
            <img src={imageUrl} alt={recipient.building.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-text-secondary/20">
              <Trophy className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <Link 
            to={getBuildingUrl(recipient.building.id, recipient.building.slug)}
            className="text-sm font-bold text-text-primary hover:opacity-75 transition-opacity truncate"
          >
            {recipient.building.name}
          </Link>
          <div className="text-2xs-plus text-text-secondary truncate">
            {recipient.building.slug.includes('building') ? 'Building' : 'Structure'}
            {recipient.edition?.year && ` · ${recipient.edition.year}`}
          </div>
        </div>
      </div>
    );
  };

  const renderPerson = () => {
    if (!recipient.person) return null;
    return (
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={recipient.person.avatarUrl || undefined} />
          <AvatarFallback className="text-xs bg-surface-muted text-text-secondary">
            {recipient.person.name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <Link 
            to={`/person/${recipient.person.slug}`}
            className="text-sm font-bold text-text-primary hover:opacity-75 transition-opacity truncate"
          >
            {recipient.person.name}
          </Link>
          <div className="text-2xs-plus text-text-secondary truncate">
            Person{recipient.edition?.year && ` · ${recipient.edition.year}`}
          </div>
        </div>
      </div>
    );
  };

  const renderCompany = () => {
    if (!recipient.company) return null;
    return (
      <div className="flex flex-col min-w-0">
        <Link 
          to={`/company/${recipient.company.slug}`}
          className="text-sm font-bold text-text-primary hover:opacity-75 transition-opacity truncate"
        >
          {recipient.company.name}
        </Link>
        <div className="text-2xs-plus text-text-secondary truncate">
          Company{recipient.edition?.year && ` · ${recipient.edition.year}`}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex items-center justify-between gap-4 py-3 border-b border-border-default last:border-0", className)}>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        {showAwardName && recipient.award && (
          <Link 
            to={`/award/${recipient.award.slug}`}
            className="text-2xs-plus font-bold text-brand-primary hover:opacity-75 transition-opacity uppercase tracking-wide mb-0.5"
          >
            {recipient.award.name}
          </Link>
        )}
        
        {recipient.recipientType === 'building' && renderBuilding()}
        {recipient.recipientType === 'person' && renderPerson()}
        {recipient.recipientType === 'company' && renderCompany()}

        {recipient.category && recipient.category.name !== 'Main Award' && (
          <div className="text-2xs text-text-secondary italic mt-1 truncate">
            {recipient.category.name}
          </div>
        )}
      </div>

      <div className="shrink-0 self-start mt-1">
        {renderBadge()}
      </div>
    </div>
  );
}
