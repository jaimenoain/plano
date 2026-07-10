import { useState, useEffect } from "react";
import { useNavigate, type MetaFunction } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn, sanitizeUsername } from "@/lib/utils";
import { Loader2, User, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LocationInput } from "@/components/ui/LocationInput";
import { resizeImage } from "@/lib/image-compression";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import { OnboardingStepper } from "../components/OnboardingStepper";

export const meta: MetaFunction = () => [
  { title: "Welcome to Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [inviter, setInviter] = useState<{
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  /** When true, completing onboarding inserts a follow row for the inviter (default on). */
  const [followInviterOnSignup, setFollowInviterOnSignup] = useState(true);
  const [loadingInitialData, setLoadingInitialData] = useState(true);

  // Load the current profile and check for inviter
  useEffect(() => {
    async function loadData() {
      try {
        if (!user) return;

        // 1. Load User Profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, country, avatar_url, location")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setAvatarUrl(profile.avatar_url);
          if (profile.location) setLocation(profile.location);

          // --- Username Logic (Auto-generate & Auto-save) ---
          // With the database trigger, profile.username should already be populated
          if (profile.username) {
            setUsername(profile.username);
          } else if (user.email) {
            // Fallback if trigger failed (e.g. legacy users or unique constraint failure handling)
            const emailName = user.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
            let finalName = emailName;

            // Check if this username is already taken
            const { data: existingUser } = await supabase
              .from("profiles")
              .select("username")
              .ilike("username", finalName)
              .maybeSingle();

            if (existingUser) {
              // If taken, append a random number
              const randomSuffix = Math.floor(1000 + Math.random() * 9000);
              finalName = `${emailName}${randomSuffix}`;
            }

            setUsername(finalName);

            // We can optionally auto-save here if we want to ensure it's in DB before 'Next'
            // But usually best to wait for explicit save.
          }
          
          // 2. Set Country Logic
          if (profile.country) {
            setCountry(profile.country);
          } else {
            // Non-blocking background fetch for country
            fetch('https://ipapi.co/json/')
              .then(res => res.json())
              .then(data => {
                if (data.country_code) {
                  setCountry(data.country_code);
                  // Also auto-set location if not present
                  if (!profile.location && data.city && data.country_name) {
                    setLocation(`${data.city}, ${data.country_name}`);
                  }
                }
              })
              .catch((): undefined => undefined);
          }
        }

        // 3. Check for Inviter in Metadata
        const invitedBy = user.user_metadata?.invited_by;
        if (invitedBy) {
          let query = supabase.from("profiles").select("id, username, avatar_url");

          // Check if invitedBy is a UUID
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invitedBy);

          if (isUuid) {
            query = query.eq("id", invitedBy);
          } else {
            query = query.eq("username", invitedBy);
          }

          const { data: inviterProfile } = await query.single();

          if (inviterProfile) {
            setInviter(inviterProfile);
            
            // Check if already following (edge case if they revisit onboarding)
            const { data: followCheck } = await supabase
              .from("follows")
              .select("*")
              .eq("follower_id", user.id)
              .eq("following_id", inviterProfile.id)
              .single();

            if (followCheck) setIsFollowing(true);
          }
        }
      } catch (_error) {
} finally {
        setLoadingInitialData(false);
      }
    }
    loadData();
  }, [user]);

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

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);

    } catch (_error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Make sure you have an 'avatars' public bucket in Supabase.",
      });
} finally {
      setUploading(false);
    }
  };

  // Shared function to handle the final steps of onboarding
  const completeOnboarding = async () => {
    if (!user) return;

    let following = isFollowing;
    if (inviter && !following && followInviterOnSignup) {
      const { error: followError } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: inviter.id,
      });
      if (!followError) {
        following = true;
        setIsFollowing(true);
      }
    }

    // If user still does not follow the inviter, nudge in-app (unchanged fallback).
    if (inviter && !following) {
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: user.id,
        actor_id: inviter.id,
        type: "suggest_follow",
        is_read: false,
      });
      if (notifError) {
        void notifError;
      }
    }

    // Mark onboarding as complete
    await supabase.auth.updateUser({
      data: { onboarding_completed: true }
    });
    
    navigate("/");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ 
        username: username,
        country: country,
        location: location,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (error) {
      setSaving(false);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "That username might be taken. Please try another.",
      });
    } else {
      await completeOnboarding();
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;

    // Even on skip, we save the current state (in case they edited the auto-generated name but hit skip)
    if (username) {
        await supabase
        .from("profiles")
        .update({ 
            username: username,
            country: country,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
        })
        .eq("id", user.id);
    }

    await completeOnboarding();
  };

  if (authLoading || loadingInitialData)
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-default safe-area-pt safe-area-pb">
        <Loader2 className="animate-spin text-text-secondary" />
      </div>
    );

  return (
    <div className="min-h-dvh w-full flex-1 bg-surface-default flex flex-col items-center justify-start md:justify-center overflow-y-auto safe-area-pt safe-area-pb px-4 py-4 md:py-8">
      <PlanoLogo className="text-2xl text-text-primary mb-4 md:mb-6 shrink-0" />
      <div className="w-full max-w-sm bg-surface-card border border-border-default rounded-sm shadow-none p-6 md:p-8 flex flex-col gap-4 md:gap-6 text-center">
        <OnboardingStepper total={3} current={1} />

        <p className="eyebrow">Step 1 of 3 · Profile</p>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Welcome.</h1>
          <p className="text-text-secondary">Let's set up your profile.</p>
        </div>

        {inviter && (
          <div className="bg-surface-muted/50 border border-border-default rounded-sm p-4 flex items-start gap-3 text-left animate-in fade-in slide-in-from-top-2">
            <Avatar className="shrink-0">
              <AvatarImage src={inviter.avatar_url || undefined} />
              <AvatarFallback>{(inviter.username ?? "?")[0]}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="follow-inviter"
                  checked={isFollowing ? true : followInviterOnSignup}
                  disabled={isFollowing}
                  onCheckedChange={(checked) =>
                    setFollowInviterOnSignup(checked === true)
                  }
                />
                <Label
                  htmlFor="follow-inviter"
                  className={cn(
                    "text-sm font-medium leading-none text-text-primary",
                    isFollowing ? "cursor-default opacity-70" : "cursor-pointer",
                  )}
                >
                  Follow {inviter.username ?? "this user"}
                </Label>
              </div>
              <p className="pl-6 text-xs text-text-secondary">They invited you!</p>
            </div>
          </div>
        )}

        {/* Avatar Selection */}
        <div className="flex flex-col items-center">
          <Avatar className="h-20 w-20 md:h-24 md:w-24 mb-3 md:mb-4 border-2 border-border-default">
            <AvatarImage src={avatarUrl || undefined} className="object-cover" />
            <AvatarFallback className="text-2xl">
              {username?.[0]?.toUpperCase() || <User className="h-10 w-10 text-text-secondary" />}
            </AvatarFallback>
          </Avatar>
          <div className="relative mt-2">
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              className="hidden"
              title="Upload avatar"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
            <Label
              htmlFor="avatar-upload"
              className="cursor-pointer inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border-2 border-dashed border-border-default px-4 py-2 text-sm text-text-secondary hover:border-border-strong"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Change Photo
            </Label>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6 text-left">
          {/* Username Field */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
                className="pl-10"
                placeholder="Choose a display name"
              />
            </div>
            <p className="text-2xs text-text-secondary">This is how other architecture lovers will see you.</p>
          </div>

          {/* Location Field (Seamlessly sets Country) */}
          <div className="space-y-2">
            <Label htmlFor="location">Where do you live?</Label>
            <LocationInput
              value={location}
              onLocationSelected={(address, code) => {
                setLocation(address);
                if (code) setCountry(code);
              }}
              placeholder="e.g. New York, USA"
            />
            <p className="text-2xs text-text-secondary">Helps us show local architecture info.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSave} disabled={saving} variant="accent" className="w-full h-11 min-h-11 font-medium rounded-sm">
            {saving ? "Saving..." : "Save and Continue"}
          </Button>
          <button
            type="button"
            onClick={() => void handleSkip()}
            className="min-h-11 w-full text-xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
