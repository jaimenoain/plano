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
import type { Company } from "@/features/credits/types";
import { updateCompany, type UpdateCompanyInput } from "@/features/credits/api/companies";

function companyInitialLetter(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  return t[0].toUpperCase();
}

function parseYear(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0 || n > 3000) return null;
  return n;
}

type EditCompanyFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company;
  onSaved: (updated: Company) => void;
};

export function EditCompanyForm({ open, onOpenChange, company, onSaved }: EditCompanyFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bio, setBio] = useState(company.bio ?? "");
  const [country, setCountry] = useState(company.country ?? "");
  const [foundedYear, setFoundedYear] = useState(company.foundedYear != null ? String(company.foundedYear) : "");
  const [dissolvedYear, setDissolvedYear] = useState(
    company.dissolvedYear != null ? String(company.dissolvedYear) : ""
  );
  const [website, setWebsite] = useState(company.website ?? "");
  const [logoUrl, setLogoUrl] = useState(company.logoUrl ?? "");

  useEffect(() => {
    if (!open) return;
    setBio(company.bio ?? "");
    setCountry(company.country ?? "");
    setFoundedYear(company.foundedYear != null ? String(company.foundedYear) : "");
    setDissolvedYear(company.dissolvedYear != null ? String(company.dissolvedYear) : "");
    setWebsite(company.website ?? "");
    setLogoUrl(company.logoUrl ?? "");
  }, [open, company]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }
      const rawFile = event.target.files[0];
      const file = await resizeImage(rawFile, 500, 500, 0.8);
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/company-${company.id}-${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setLogoUrl(data.publicUrl);
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
    const fy = parseYear(foundedYear);
    const dy = parseYear(dissolvedYear);
    if (foundedYear.trim() !== "" && fy === null) {
      toast({ variant: "destructive", description: "Founded year must be a valid number." });
      return;
    }
    if (dissolvedYear.trim() !== "" && dy === null) {
      toast({ variant: "destructive", description: "Dissolved year must be a valid number." });
      return;
    }
    const patch: UpdateCompanyInput = {
      bio: bio.trim() || null,
      country: country.trim() || null,
      foundedYear: fy,
      dissolvedYear: dy,
      website: website.trim() || null,
      logoUrl: logoUrl.trim() || null,
    };
    setSaving(true);
    try {
      const updated = await updateCompany(company.id, patch);
      if (!updated) {
        toast({ variant: "destructive", description: "Could not save changes." });
        return;
      }
      onSaved(updated);
      toast({ description: "Company updated" });
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
            <SheetTitle>Edit company</SheetTitle>
            <SheetDescription>Updates your public company page on Plano.</SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex flex-1 flex-col gap-6 overflow-y-auto pr-1">
            <div className="flex flex-col items-start gap-3">
              <Label>Logo</Label>
              <Avatar className="h-20 w-20 rounded-sm border border-border-default">
                {logoUrl ? <AvatarImage src={logoUrl} alt="" /> : null}
                <AvatarFallback className="rounded-sm text-sm font-medium text-text-primary">
                  {companyInitialLetter(company.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Upload company logo"
                  onChange={handleLogoUpload}
                  disabled={uploading || !user}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading || !user}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Choose logo file"
                >
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload image
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-company-bio">Bio</Label>
              <Textarea
                id="edit-company-bio"
                value={bio}
                onChange={(ev) => setBio(ev.target.value)}
                rows={4}
                className="resize-none border-border-default bg-transparent text-sm"
                maxLength={10000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-company-country">Country</Label>
              <Input
                id="edit-company-country"
                value={country}
                onChange={(ev) => setCountry(ev.target.value)}
                className="border-border-default bg-transparent"
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-company-founded">Founded year</Label>
                <Input
                  id="edit-company-founded"
                  inputMode="numeric"
                  value={foundedYear}
                  onChange={(ev) => setFoundedYear(ev.target.value)}
                  placeholder="e.g. 1998"
                  className="border-border-default bg-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-company-dissolved">Dissolved year</Label>
                <Input
                  id="edit-company-dissolved"
                  inputMode="numeric"
                  value={dissolvedYear}
                  onChange={(ev) => setDissolvedYear(ev.target.value)}
                  placeholder="Optional"
                  className="border-border-default bg-transparent"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-company-website">Website</Label>
              <Input
                id="edit-company-website"
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
