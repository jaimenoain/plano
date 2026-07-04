import { useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useEditionEvents,
  useCreateEditionEvent,
  useDeleteEditionEvent,
} from "@/features/awards/hooks/useAwards";
import {
  type AwardEditionEventType,
  editionEventTypeLabels,
} from "@/features/awards/types/awards";

const EVENT_TYPE_OPTIONS = Object.entries(editionEventTypeLabels) as [AwardEditionEventType, string][];

const emptyForm = {
  event_type: "winner_announcement" as AwardEditionEventType,
  event_date: "",
  location:   "",
  notes:      "",
};

// Parse a YYYY-MM-DD date string as local time (avoids UTC-offset day-shift).
function parseLocalDate(iso: string): Date {
  return new Date(iso + "T12:00:00");
}

interface Props {
  editionId: string;
}

export function EditionEventsSection({ editionId }: Props) {
  const { data: events = [], isLoading } = useEditionEvents(editionId);
  const createEvent = useCreateEditionEvent();
  const deleteEvent = useDeleteEditionEvent();

  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState(emptyForm);

  const handleAdd = () => {
    if (!form.event_date) {
      toast.error("Date is required");
      return;
    }
    createEvent.mutate(
      {
        edition_id: editionId,
        event_type: form.event_type,
        event_date: form.event_date,
        location:   form.location.trim() || null,
        notes:      form.notes.trim()    || null,
      },
      {
        onSuccess: () => {
          toast.success("Event added");
          setAdding(false);
          setForm(emptyForm);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (e: any) => toast.error(e.message ?? "Failed to add event"),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Events</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAdding(true)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add event
        </Button>
      </div>

      {/* Inline add form */}
      {adding && (
        <div className="rounded-sm border border-border-default bg-surface-muted/30 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Event type</Label>
              <select
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value as AwardEditionEventType })}
                className="h-8 w-full rounded-sm border border-border-default bg-surface-card px-2 text-sm text-text-primary focus:outline-hidden focus:ring-1 focus:ring-brand-primary"
              >
                {EVENT_TYPE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                className="h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Location <span className="opacity-50">(optional)</span></Label>
              <Input
                placeholder="e.g. RIBA, London"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes <span className="opacity-50">(optional)</span></Label>
              <Input
                placeholder="Any extra context"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="h-8"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={createEvent.isPending || !form.event_date}
            >
              {createEvent.isPending ? "Adding…" : "Add"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setAdding(false); setForm(emptyForm); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Events list */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
        </div>
      ) : events.length === 0 ? (
        <p className="py-2 text-sm text-text-secondary">No events logged for this edition.</p>
      ) : (
        <div className="overflow-hidden rounded-sm border border-border-default divide-y divide-border-default">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between gap-4 bg-surface-card px-4 py-3"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="shrink-0 tabular-nums text-sm text-text-secondary whitespace-nowrap">
                  {parseLocalDate(ev.eventDate).toLocaleDateString(undefined, { dateStyle: "medium" })}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary">
                    {editionEventTypeLabels[ev.eventType]}
                  </div>
                  {ev.location && (
                    <div className="truncate text-xs text-text-secondary">{ev.location}</div>
                  )}
                  {ev.notes && (
                    <div className="truncate text-xs text-text-secondary">{ev.notes}</div>
                  )}
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-text-secondary hover:text-feedback-error"
                onClick={() =>
                  deleteEvent.mutate(ev.id, {
                    onSuccess: () => toast.success("Event removed"),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onError:   (e: any) => toast.error(e.message ?? "Failed to remove event"),
                  })
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
