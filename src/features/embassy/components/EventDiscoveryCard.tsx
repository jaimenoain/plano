import { Link } from "react-router";
import { format, parseISO } from "date-fns";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EventDiscovery } from "../api/taskFeed";

export function EventDiscoveryCard({
  discovery: d,
  onEdit,
  onPublish,
  onDiscard,
  isPublishing,
  isDiscarding,
}: {
  discovery: EventDiscovery;
  onEdit: () => void;
  onPublish: () => void;
  onDiscard: () => void;
  isPublishing: boolean;
  isDiscarding: boolean;
}) {
  const isDuplicate = !!d.duplicate_of_event_id;

  return (
    <Card className={cn("p-5 transition-all", isDuplicate ? "border-feedback-warning/40" : "border-border-default")}>
      <CardContent className="p-0">
        <div className="flex gap-4">
          {d.cover_image_url && (
            <img
              src={d.cover_image_url}
              alt=""
              className="w-16 h-16 rounded-none object-cover shrink-0"
            />
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="font-semibold text-text-primary leading-snug">{d.title}</h3>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>{format(parseISO(d.start_at), "EEE d MMM yyyy · HH:mm")}</p>
              {d.address && <p>{d.address}</p>}
            </div>

            {isDuplicate && d.duplicate_of_title && (
              <div className="flex items-start gap-1.5 rounded-sm bg-feedback-warning/10 border border-feedback-warning/30 px-3 py-2 text-xs text-feedback-warning">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Possible duplicate of{" "}
                  <Link
                    to={`/events/${d.duplicate_of_event_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:opacity-80"
                  >
                    &ldquo;{d.duplicate_of_title}&rdquo;
                    {d.duplicate_of_start_at && (
                      <> ({format(parseISO(d.duplicate_of_start_at), "d MMM")})</>
                    )}
                  </Link>
                </span>
              </div>
            )}

            {d.description && (
              <p className="text-sm text-text-primary/80 leading-snug">{d.description}</p>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              {d.external_link ? (
                <a
                  href={d.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-text-primary hover:opacity-70 transition-opacity"
                >
                  View event <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <a
                  href={d.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-text-primary hover:opacity-70 transition-opacity"
                >
                  View event <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {d.external_link && d.source_url !== d.external_link && (
                <a
                  href={d.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-text-primary transition-colors"
                >
                  Source <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-border-default">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-feedback-destructive border-feedback-destructive/40 hover:bg-feedback-destructive/10"
              disabled={isDiscarding}
              onClick={onDiscard}
            >
              {isDiscarding && <Loader2 className="h-3 w-3 animate-spin" />}
              Discard
            </Button>
          </div>
          <Button
            size="sm"
            disabled={isPublishing}
            onClick={onPublish}
            variant={isDuplicate ? "ghost" : "default"}
            className={cn(
              isDuplicate &&
                "border border-feedback-destructive/40 bg-feedback-destructive/10 text-feedback-destructive hover:bg-feedback-destructive/20",
            )}
          >
            {isPublishing && <Loader2 className="h-3 w-3 animate-spin" />}
            {isDuplicate ? "Publish anyway" : "Publish event"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
