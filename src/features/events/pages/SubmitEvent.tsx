import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Loader2, MapPin, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationInput } from "@/components/ui/LocationInput";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getEventBySlug } from "@/features/events/api/eventsApi";
import { eventKeys } from "@/features/events/queryKeys";
import { useSubmitEvent, type SubmitEventMutationError } from "@/features/events/hooks/useSubmitEvent";
import { useUpdateEvent } from "@/features/events/hooks/useUpdateEvent";
import type { EventDTO, EventsApiError } from "@/features/events/types";
import { SubmitEventSchema, type SubmitEventInput } from "@/features/events/schemas";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { getGeocode, getLatLng } from "@/lib/googleMapsGeocoding";

type BuildingSearchRow = {
  id: string;
  name: string;
  city?: string | null;
};

type SelectedBuilding = { id: string; name: string };

type FormValues = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  externalLink: string;
  coverImageUrl: string;
  isSelfHosted: boolean;
  lat: string;
  lng: string;
};

function toIsoFromDateAndTime(date: Date, time: string): string {
  const [hh = "0", mm = "0"] = time.split(":");
  const d = new Date(date);
  d.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
  return d.toISOString();
}

function parseOptionalLatLng(lat: string, lng: string): { lat?: number; lng?: number } {
  const lt = lat.trim();
  const lg = lng.trim();
  if (!lt && !lg) return {};
  const la = Number(lt);
  const ln = Number(lg);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return {};
  return { lat: la, lng: ln };
}

function isSubmitMutationError(e: unknown): e is SubmitEventMutationError {
  return typeof e === "object" && e !== null && "message" in e && "code" in e;
}

function isEventsApiError(e: unknown): e is EventsApiError {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    "message" in e &&
    typeof (e as EventsApiError).code === "string" &&
    typeof (e as EventsApiError).message === "string"
  );
}

function toUpdatePrior(event: EventDTO) {
  return {
    id: event.id,
    slug: event.slug,
    isSelfHosted: event.isSelfHosted,
    claimStatus: event.claimStatus,
    organiserPersonId: event.organiser?.kind === "person" ? (event.organiser.personId ?? null) : null,
    organiserCompanyId: event.organiser?.kind === "company" ? (event.organiser.companyId ?? null) : null,
  };
}

export default function SubmitEvent() {
  const params = useParams();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const submitEvent = useSubmitEvent();
  const updateEvent = useUpdateEvent();

  const editSlug =
    location.pathname.endsWith("/edit") && typeof params.slug === "string" ? params.slug.trim() : "";
  const isEditMode = editSlug.length > 0;
  const loginRedirectPath = isEditMode ? `/events/${editSlug}/edit` : "/events/new";

  const hydratedEventIdRef = useRef<string | null>(null);
  useEffect(() => {
    hydratedEventIdRef.current = null;
  }, [editSlug]);

  const [startDay, setStartDay] = useState<Date>(() => new Date());
  const [endDay, setEndDay] = useState<Date | undefined>(undefined);
  const [address, setAddress] = useState("");
  const [buildingQuery, setBuildingQuery] = useState("");
  const debouncedBuildingQuery = useDebounce(buildingQuery, 300);
  const [selectedBuildings, setSelectedBuildings] = useState<SelectedBuilding[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    defaultValues: {
      title: "",
      description: "",
      startTime: "12:00",
      endTime: "13:00",
      externalLink: "",
      coverImageUrl: "",
      isSelfHosted: false,
      lat: "",
      lng: "",
    },
  });

  const eventQuery = useQuery({
    queryKey: eventKeys.detail(editSlug),
    queryFn: () => getEventBySlug(editSlug),
    enabled: isEditMode && editSlug.length > 0 && !authLoading && Boolean(user),
    staleTime: 0,
  });

  const event = eventQuery.data;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(loginRedirectPath)}`, { replace: true });
    }
  }, [authLoading, user, navigate, loginRedirectPath]);

  useEffect(() => {
    if (!isEditMode || !event || !user) return;
    if (user.id !== event.submittedBy.userId) {
      navigate(`/events/${event.slug}`, { replace: true });
    }
  }, [isEditMode, event, user, navigate]);

  useEffect(() => {
    if (!isEditMode || !event || !user || user.id !== event.submittedBy.userId) return;
    if (hydratedEventIdRef.current === event.id) return;
    hydratedEventIdRef.current = event.id;

    form.reset({
      title: event.title,
      description: event.description ?? "",
      startTime: format(parseISO(event.startAt), "HH:mm"),
      endTime: event.endAt ? format(parseISO(event.endAt), "HH:mm") : "12:00",
      externalLink: event.externalLink ?? "",
      coverImageUrl: event.coverImageUrl ?? "",
      isSelfHosted: event.isSelfHosted,
      lat: event.lat != null ? String(event.lat) : "",
      lng: event.lng != null ? String(event.lng) : "",
    });
    setStartDay(parseISO(event.startAt));
    setEndDay(event.endAt ? parseISO(event.endAt) : undefined);
    setAddress(event.address ?? "");
    setSelectedBuildings(event.buildings.map((b) => ({ id: b.buildingId, name: b.name })));
  }, [isEditMode, event, user, form]);

  const { data: buildingHits = [], isFetching: buildingsLoading } = useQuery({
    queryKey: ["submit-event-search-buildings", debouncedBuildingQuery],
    queryFn: async () => {
      if (!debouncedBuildingQuery || debouncedBuildingQuery.length < 2) return [];
      const { data, error } = await supabase.rpc("search_buildings", {
        query_text: debouncedBuildingQuery,
      });
      if (error) return [];
      return (data as unknown as BuildingSearchRow[]).slice(0, 12);
    },
    enabled: debouncedBuildingQuery.length >= 2,
    staleTime: 60_000,
  });

  const onLocationPicked = async (nextAddress: string, countryCode: string, placeName?: string) => {
    setAddress(nextAddress);
    if (countryCode || placeName) {
      try {
        const results = await getGeocode({ address: nextAddress });
        if (results?.[0]) {
          const { lat, lng } = await getLatLng(results[0]);
          form.setValue("lat", String(lat));
          form.setValue("lng", String(lng));
        }
      } catch {
        // Optional coordinates stay manual / empty
      }
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    const startAt = toIsoFromDateAndTime(startDay, values.startTime);
    const endAt =
      endDay !== undefined ? toIsoFromDateAndTime(endDay, values.endTime || "12:00") : undefined;

    const coords = parseOptionalLatLng(values.lat, values.lng);

    const payload: SubmitEventInput = {
      title: values.title.trim(),
      description: values.description?.trim() ? values.description.trim() : undefined,
      startAt,
      endAt,
      address: address.trim() || undefined,
      lat: coords.lat,
      lng: coords.lng,
      externalLink: values.externalLink || undefined,
      coverImageUrl: values.coverImageUrl || undefined,
      isSelfHosted: values.isSelfHosted,
      buildingIds: selectedBuildings.map((b) => b.id),
    };

    const parsed = SubmitEventSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg =
        first.title?.[0] ??
        first.startAt?.[0] ??
        first.endAt?.[0] ??
        first.externalLink?.[0] ??
        first.coverImageUrl?.[0] ??
        first.buildingIds?.[0] ??
        first.lat?.[0] ??
        first.lng?.[0] ??
        "Please fix the highlighted fields.";
      setFormError(msg);
      return;
    }

    if (isEditMode) {
      if (!event || user?.id !== event.submittedBy.userId) return;
      updateEvent.mutate(
        { prior: toUpdatePrior(event), raw: parsed.data },
        {
          onError: (e) => {
            if (isSubmitMutationError(e)) {
              setFormError(e.message);
            } else {
              setFormError("Something went wrong. Please try again.");
            }
          },
        },
      );
      return;
    }

    submitEvent.reset();
    submitEvent.mutate(parsed.data, {
      onError: (e) => {
        if (isSubmitMutationError(e)) {
          setFormError(e.message);
        } else {
          setFormError("Something went wrong. Please try again.");
        }
      },
    });
  });

  const addBuilding = (b: BuildingSearchRow) => {
    if (selectedBuildings.some((x) => x.id === b.id)) return;
    if (selectedBuildings.length >= 20) return;
    setSelectedBuildings((prev) => [...prev, { id: b.id, name: b.name }]);
    setBuildingQuery("");
  };

  const removeBuilding = (id: string) => {
    setSelectedBuildings((prev) => prev.filter((b) => b.id !== id));
  };

  const pageTitle = isEditMode ? "Edit event" : "Share an event";

  if (authLoading || !user) {
    return (
      <AppLayout title={pageTitle} showBack>
        <div className="flex min-h-[40vh] items-center justify-center text-text-secondary">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      </AppLayout>
    );
  }

  if (isEditMode && editSlug) {
    if (eventQuery.isPending) {
      return (
        <AppLayout title={pageTitle} showBack>
          <div className="flex min-h-[40vh] items-center justify-center text-text-secondary">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          </div>
        </AppLayout>
      );
    }
    if (eventQuery.isError) {
      const msg = isEventsApiError(eventQuery.error)
        ? eventQuery.error.message
        : "This event could not be loaded.";
      return (
        <AppLayout title={pageTitle} showBack>
          <div className="mx-auto max-w-2xl px-4 py-8 text-center">
            <p className="text-sm text-destructive" role="alert">
              {msg}
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/events">Back to events</Link>
            </Button>
          </div>
        </AppLayout>
      );
    }
    if (!event || user.id !== event.submittedBy.userId) {
      return (
        <AppLayout title={pageTitle} showBack>
          <div className="flex min-h-[40vh] items-center justify-center text-text-secondary">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          </div>
        </AppLayout>
      );
    }
  }

  return (
    <AppLayout title={pageTitle} showBack>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">{pageTitle}</h1>
        <p className="mt-2 text-text-secondary">
          {isEditMode
            ? "Only the member who submitted this event can change these details."
            : "Add a community event to the map. Fields marked * are required."}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Basics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="event-title">Title *</Label>
                <Input id="event-title" autoComplete="off" {...form.register("title")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-description">Description</Label>
                <Textarea id="event-description" rows={5} {...form.register("description")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>When</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" aria-hidden />
                        {format(startDay, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startDay} onSelect={(d) => d && setStartDay(d)} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start time *</Label>
                  <Input id="start-time" type="time" {...form.register("startTime")} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>End date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" aria-hidden />
                        {endDay ? format(endDay, "PPP") : "Optional"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDay}
                        onSelect={(d) => setEndDay(d ?? undefined)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End time</Label>
                  <Input id="end-time" type="time" {...form.register("endTime")} disabled={!endDay} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Where</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Address</Label>
                <LocationInput
                  value={address}
                  onLocationSelected={onLocationPicked}
                  placeholder="Search for a venue or address…"
                  searchTypes={[]}
                  className="w-full"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lat">Latitude</Label>
                  <Input id="lat" inputMode="decimal" placeholder="Optional" {...form.register("lat")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lng">Longitude</Label>
                  <Input id="lng" inputMode="decimal" placeholder="Optional" {...form.register("lng")} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Link buildings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="building-search">Search buildings</Label>
                <Input
                  id="building-search"
                  value={buildingQuery}
                  onChange={(e) => setBuildingQuery(e.target.value)}
                  placeholder="Type at least 2 characters…"
                  autoComplete="off"
                />
                {buildingsLoading && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Searching…
                  </div>
                )}
                {!buildingsLoading && debouncedBuildingQuery.length >= 2 && buildingHits.length === 0 && (
                  <p className="text-sm text-text-secondary">No buildings found.</p>
                )}
                {buildingHits.length > 0 && (
                  <ul className="max-h-48 overflow-auto rounded-sm border border-border-default bg-surface-muted">
                    {buildingHits.map((b) => (
                      <li key={b.id}>
                        <button
                          type="button"
                          className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-surface-overlay"
                          onClick={() => addBuilding(b)}
                        >
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                          <span>
                            <span className="font-medium text-text-primary">{b.name}</span>
                            {b.city ? (
                              <span className="block text-text-secondary">{b.city}</span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedBuildings.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedBuildings.map((b) => (
                    <span
                      key={b.id}
                      className="inline-flex items-center gap-1 rounded-full border border-border-default bg-surface-muted px-3 py-1 text-sm text-text-primary"
                    >
                      {b.name}
                      <button
                        type="button"
                        className="rounded-full p-0.5 hover:bg-surface-overlay"
                        onClick={() => removeBuilding(b.id)}
                        aria-label={`Remove ${b.name}`}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Links & organiser</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="external-link">External link</Label>
                <Input id="external-link" type="url" placeholder="https://…" {...form.register("externalLink")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cover-url">Cover image URL</Label>
                <Input id="cover-url" type="url" placeholder="https://…" {...form.register("coverImageUrl")} />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-sm border border-border-default bg-surface-muted px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">I&apos;m the organiser</p>
                  <p className="text-xs text-text-secondary">Marks the event as self-hosted and claims it for your account.</p>
                </div>
                <Controller
                  name="isSelfHosted"
                  control={form.control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="I'm the organiser" />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitEvent.isPending || updateEvent.isPending}
            className="w-full sm:w-auto"
          >
            {submitEvent.isPending || updateEvent.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                {isEditMode ? "Saving…" : "Submitting…"}
              </>
            ) : isEditMode ? (
              "Save changes"
            ) : (
              "Submit event"
            )}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
