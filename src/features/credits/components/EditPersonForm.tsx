import { useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { resizeImage } from "@/lib/image-compression";
import type { Person } from "@/features/credits/types";
import { updatePerson, type UpdatePersonInput } from "@/features/credits/api/people";

function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function parseYear(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0 || n > 3000) return null;
  return n;
}

type EditPersonFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: Person;
  onSaved: (updated: Person) => void;
};

export function EditPersonForm({ open, onOpenChange, person, onSaved }: EditPersonFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bio, setBio] = useState(person.bio ?? "");
  const [nationality, setNationality] = useState(person.nationality ?? "");
  const [birthYear, setBirthYear] = useState(person.birthYear != null ? String(person.birthYear) : "");
  const [deathYear, setDeathYear] = useState(person.deathYear != null ? String(person.deathYear) : "");
  const [locationNote, setLocationNote] = useState(person.locationNote ?? "");
  const [website, setWebsite] = useState(person.website ?? "");
  const [avatarUrl, setAvatarUrl] = useState(person.avatarUrl ?? "");

  useEffect(() => {
    if (!open) return;
    setBio(person.bio ?? "");
    setNationality(person.nationality ?? "");
    setBirthYear(person.birthYear != null ? String(person.birthYear) : "");
    setDeathYear(person.deathYear != null ? String(person.deathYear) : "");
    setLocationNote(person.locationNote ?? "");
    setWebsite(person.website ?? "");
    setAvatarUrl(person.avatarUrl ?? "");
  }, [open, person]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }
      const rawFile = event.target.files[0];
      const file = await resizeImage(rawFile, 500, 500, 0.8);
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (_error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Make sure you have an avatars bucket configured.",
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const by = parseYear(birthYear);
    const dy = parseYear(deathYear);
    if (birthYear.trim() !== "" && by === null) {
      toast({ variant: "destructive", description: "Birth year must be a valid number." });
      return;
    }
    if (deathYear.trim() !== "" && dy === null) {
      toast({ variant: "destructive", description: "Death year must be a valid number." });
      return;
    }
    const patch: UpdatePersonInput = {
      bio: bio.trim() || null,
      nationality: nationality.trim() || null,
      birthYear: by,
      deathYear: dy,
      locationNote: locationNote.trim() || null,
      website: website.trim() || null,
      avatarUrl: avatarUrl.trim() || null,
    };
    setSaving(true);
    try {
      const updated = await updatePerson(person.id, patch);
      if (!updated) {
        toast({ variant: "destructive", description: "Could not save changes." });
        return;
      }
      onSaved(updated);
      toast({ description: "Profile updated" });
      onOpenChange(false);
    } catch (err) {
      toast({
        variant: "destructive",
        description: err instanceof Error ? err.message : "Could not save changes.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-l border-border-default bg-surface-overlay sm:max-w-md"
      >
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader className="text-left">
            <SheetTitle>Edit professional profile</SheetTitle>
            <SheetDescription>Updates your public person page on Plano.</SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex flex-1 flex-col gap-6 overflow-y-auto pr-1">
            <div className="flex flex-col items-start gap-3">
              <Label>Photo</Label>
              <Avatar className="h-20 w-20 rounded-full border border-border-default">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                <AvatarFallback className="rounded-full text-sm font-medium text-text-primary">
                  {personInitials(person.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Upload profile photo"
                  onChange={handleAvatarUpload}
                  disabled={uploading || !user}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading || !user}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Choose profile photo file"
                >
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload image
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-person-bio">Bio</Label>
              <Textarea
                id="edit-person-bio"
                value={bio}
                onChange={(ev) => setBio(ev.target.value)}
                rows={4}
                className="resize-none border-border-default bg-transparent text-sm"
                maxLength={10000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-person-nationality">Nationality</Label>
              <Input
                id="edit-person-nationality"
                value={nationality}
                onChange={(ev) => setNationality(ev.target.value)}
                className="border-border-default bg-transparent"
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-person-birth">Birth year</Label>
                <Input
                  id="edit-person-birth"
                  inputMode="numeric"
                  value={birthYear}
                  onChange={(ev) => setBirthYear(ev.target.value)}
                  placeholder="e.g. 1945"
                  className="border-border-default bg-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-person-death">Death year</Label>
                <Input
                  id="edit-person-death"
                  inputMode="numeric"
                  value={deathYear}
                  onChange={(ev) => setDeathYear(ev.target.value)}
                  placeholder="Optional"
                  className="border-border-default bg-transparent"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-person-location">Location note</Label>
              <Input
                id="edit-person-location"
                value={locationNote}
                onChange={(ev) => setLocationNote(ev.target.value)}
                className="border-border-default bg-transparent"
                maxLength={1000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-person-website">Website</Label>
              <Input
                id="edit-person-website"
                value={website}
                onChange={(ev) => setWebsite(ev.target.value)}
                className="border-border-default bg-transparent"
                maxLength={2000}
                placeholder="https://…"
              />
            </div>
          </div>

          <SheetFooter className="mt-6 gap-2 border-t border-border-default pt-4 sm:flex-col sm:space-x-0">
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
