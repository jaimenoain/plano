import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { sanitizeUsername } from "@/lib/utils";
import { Loader2, Globe, User, UserPlus, Check, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LocationInput } from "@/components/ui/LocationInput";

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
  
  const [inviter, setInviter] = useState<{ id: string; username: string; avatar_url: string | null } | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
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
              .catch(() => console.log("Could not auto-detect country"));
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
      } catch (error) {
        console.error("Error loading onboarding data:", error);
      } finally {
        setLoadingInitialData(false);
      }
    }
    loadData();
  }, [user]);

  const handleFollowInviter = async () => {
    if (!user || !inviter) return;
    setFollowLoading(true);
    
    try {
      // Ensure we have a username before following (double check)
      if (!username) {
        throw new Error("Username required to follow");
      }

      const { error } = await supabase
        .from("follows")
        .insert({
          follower_id: user.id,
          following_id: inviter.id
        });

      if (error) throw error;
      
      setIsFollowing(true);
      toast({
        title: "Following",
        description: `You are now following ${inviter.username}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not follow user. Please try again.",
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Make sure you have an 'avatars' public bucket in Supabase.",
      });
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // Shared function to handle the final steps of onboarding
  const completeOnboarding = async () => {
    if (!user) return;

    // Logic: If user was invited but hasn't followed the inviter yet, 
    // send a notification to the user suggesting they follow them.
    if (inviter && !isFollowing) {
      console.log("Creating suggest_follow notification");
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: user.id, // The notification is FOR the new user
          actor_id: inviter.id, // The actor is the inviter
          // Cast to 'any' allows this string even if your local types.ts is not yet updated.
          // Ensure your DB 'type' column accepts 'suggest_follow'.
          type: "suggest_follow" as any, 
          is_read: false
        });
        
      if (notifError) {
        console.error("Failed to create suggestion notification:", notifError);
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

  if (authLoading || loadingInitialData) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Welcome!</h1>
          <p className="text-muted-foreground">Let's set up your profile.</p>
        </div>

        {inviter && (
          <div className="bg-secondary/30 border border-border/50 rounded-xl p-4 flex items-center justify-between gap-3 text-left animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={inviter.avatar_url || undefined} />
                <AvatarFallback>{inviter.username[0]}</AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Follow {inviter.username}</p>
                <p className="text-xs text-muted-foreground">They invited you!</p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant={isFollowing ? "outline" : "default"}
              onClick={handleFollowInviter}
              disabled={isFollowing || followLoading}
              className="h-8"
            >
              {followLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isFollowing ? (
                <><Check className="h-3 w-3 mr-1" /> Following</>
              ) : (
                <><UserPlus className="h-3 w-3 mr-1" /> Follow</>
              )}
            </Button>
          </div>
        )}

        {/* Avatar Selection */}
        <div className="flex flex-col items-center">
          <Avatar className="h-24 w-24 mb-4 border-2 border-border">
            <AvatarImage src={avatarUrl || undefined} className="object-cover" />
            <AvatarFallback className="text-2xl">
              {username?.[0]?.toUpperCase() || <User className="h-10 w-10 text-muted-foreground" />}
            </AvatarFallback>
          </Avatar>
          <div className="relative">
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
            <Label
              htmlFor="avatar-upload"
              className="cursor-pointer inline-flex items-center gap-2 bg-secondary px-4 py-2 rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Change Photo
            </Label>
          </div>
        </div>

        <div className="space-y-6 text-left">
          {/* Username Field */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
                className="pl-10"
                placeholder="Choose a display name"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">This is how other architecture lovers will see you.</p>
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
            <p className="text-[10px] text-muted-foreground">Helps us show local architecture info.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save and Continue"}
          </Button>
          <Button variant="ghost" onClick={handleSkip} className="w-full">
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
}
