import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2, Upload, Lock, Mail, Check, X, Search, Smartphone, Download, Database } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sanitizeUsername } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { useUserProfile } from "@/hooks/useUserProfile";
import { LocationInput } from "@/components/ui/LocationInput";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "@/lib/countries";
import { NavigationBlocker } from "@/components/common/NavigationBlocker";

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const { profile, refetch: refetchProfile } = useUserProfile();
  const navigate = useNavigate();
  const locationHook = useLocation();
  const { toast } = useToast();
  const { isInstallable, isIOS, promptInstall } = usePwaInstall();
  
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [subscribedPlatforms, setSubscribedPlatforms] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<{name: string, logo: string}[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  
  // FIX 1: Split the malformed useState into correct separate hooks
  const [openCombobox, setOpenCombobox] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // FIX 2: Add state for Manual Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [initialState, setInitialState] = useState<{
    username: string;
    bio: string;
    country: string;
    location: string;
    avatarUrl: string | null;
    email: string;
    subscribedPlatforms: string[];
  } | null>(null);

  useEffect(() => {
    if (justSaved) {
      navigate("/profile");
    }
  }, [justSaved, navigate]);

  useEffect(() => {
    if (locationHook.hash && initialState) {
      const id = locationHook.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [locationHook.hash, initialState]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (user && profile) {
      const emailVal = user.email || "";
      const usernameVal = profile.username || "";
      const bioVal = profile.bio || "";
      const avatarUrlVal = profile.avatar_url;
      const countryVal = profile.country || "";
      const locationVal = profile.location || "";
      const platformsVal = profile.subscribed_platforms || [];

      setEmail(emailVal);
      setUsername(usernameVal);
      setBio(bioVal);
      setAvatarUrl(avatarUrlVal);
      setCountry(countryVal);
      setLocation(locationVal);
      setSubscribedPlatforms(platformsVal);

      setInitialState({
        username: usernameVal,
        bio: bioVal,
        country: countryVal,
        location: locationVal,
        avatarUrl: avatarUrlVal,
        email: emailVal,
        subscribedPlatforms: platformsVal,
      });

      if (profile.country) {
        fetchAvailablePlatforms(profile.country);
      }
    }
  }, [user, authLoading, navigate, profile]);

  const isDirty = (() => {
    if (!initialState) return false;
    if (username !== initialState.username) return true;
    if (bio !== initialState.bio) return true;
    if (country !== initialState.country) return true;
    if (location !== initialState.location) return true;
    if (avatarUrl !== initialState.avatarUrl) return true;
    if (email !== initialState.email) return true;
    if (newPassword !== "") return true;

    if (subscribedPlatforms.length !== initialState.subscribedPlatforms.length) return true;

    // Sort both arrays to ensure order doesn't affect comparison
    const sortedCurrent = [...subscribedPlatforms].sort();
    const sortedInitial = [...initialState.subscribedPlatforms].sort();

    return JSON.stringify(sortedCurrent) !== JSON.stringify(sortedInitial);
  })();

  const fetchAvailablePlatforms = async (countryCode: string) => {
    if (!countryCode) return;
    setLoadingPlatforms(true);
    try {
      // Fetch all providers for the country
      const { data: tmdbResponse, error } = await supabase.functions.invoke("tmdb-providers", {
        body: { watch_region: countryCode },
      });

      // FIX 3: Diagnostic logging (Requested in Investigation Step 2)
      if (error) {
        console.log("Supabase Invoke Error:", JSON.stringify(error, null, 2));
      } else {
        console.log("Response Data:", tmdbResponse);
      }

      if (!error && tmdbResponse?.results) {
        const providers = tmdbResponse.results.map((p: any) => ({
          name: p.provider_name,
          logo: p.logo_path
        }));

        // Remove duplicates and sort alphabetically
        const uniqueProviders = Array.from(new Map(providers.map((item: any) => [item.name, item])).values())
          .sort((a: any, b: any) => a.name.localeCompare(b.name));

        setAvailablePlatforms(uniqueProviders as {name: string, logo: string}[]);
      } else {
        setAvailablePlatforms([]);
      }
    } catch (e) {
      console.error("Error fetching platforms", e);
    } finally {
      setLoadingPlatforms(false);
    }
  };

  const addPlatform = (platformName: string) => {
    if (!subscribedPlatforms.includes(platformName)) {
      setSubscribedPlatforms([...subscribedPlatforms, platformName]);
    }
    setOpenCombobox(false);
    setSearchQuery(""); // Clear search on selection
  };

  const removePlatform = (platformName: string) => {
    setSubscribedPlatforms(subscribedPlatforms.filter(p => p !== platformName));
  };

  // FIX 4: Manual Filtering Logic
  // We filter the array ourselves instead of letting the Command component do it blindly
  const filteredPlatforms = availablePlatforms.filter((platform) =>
    platform.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // 1. Update Profile Data (Database)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username,
          bio,
          country,
          location,
          avatar_url: avatarUrl,
          subscribed_platforms: subscribedPlatforms,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // 2. Update Auth Data (Email/Password)
      const authUpdates: { email?: string; password?: string } = {};
      if (email !== user.email) authUpdates.email = email;
      if (newPassword) authUpdates.password = newPassword;

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdates);
        if (authError) throw authError;
        
        if (authUpdates.email) {
          toast({
            title: "Check your email",
            description: "A confirmation link has been sent to your new email address.",
          });
        }
      }

      // Refetch profile to update context
      refetchProfile();

      toast({
        title: "Settings updated",
        description: "Your profile has been successfully updated.",
      });
      
      // Update initial state to prevent navigation blocker
      setInitialState({
        username,
        bio,
        country,
        location,
        avatarUrl,
        email,
        subscribedPlatforms,
      });
      setJustSaved(true);

      // Clear password field after update
      setNewPassword("");
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not update settings. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user!.id}/${Math.random()}.${fileExt}`;

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

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('log')
        .select(`
          rating,
          content,
          tags,
          status,
          watched_at,
          created_at,
          films (
            title,
            imdb_id
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "No data found",
          description: "You haven't rated or watched any films yet.",
        });
        return;
      }

      // Helper function to escape CSV fields
      const escapeCsvCell = (cell: any): string => {
        if (cell === null || cell === undefined) return "";
        const str = String(cell);
        if (str.includes(",") || str.includes("\n") || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Helper to format date
      const formatDate = (dateStr: string | null): string => {
        if (!dateStr) return "";
        return new Date(dateStr).toISOString().split('T')[0];
      };

      // Generate CSV
      const headers = ["Title", "IMDb ID", "Rating", "Review", "Tags", "Status", "Date"];
      const rows = data.map((item: any) => {
        return [
          escapeCsvCell(item.films?.title),
          escapeCsvCell(item.films?.imdb_id),
          escapeCsvCell(item.rating),
          escapeCsvCell(item.content),
          escapeCsvCell(item.tags ? item.tags.join("|") : ""),
          escapeCsvCell(item.status === "pending" ? "Bucket List" : "Visited"),
          escapeCsvCell(formatDate(item.watched_at || item.created_at))
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `cineforum-data-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export complete",
        description: "Your data has been successfully downloaded.",
      });

    } catch (error: any) {
      console.error("Export failed:", error);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Could not export your data. Please try again.",
      });
    } finally {
      setExporting(false);
    }
  };

  if (authLoading) return null;

  return (
    <AppLayout title="Settings" showLogo={false}>
      <NavigationBlocker isDirty={isDirty} />
      <div className="container max-w-lg mx-auto p-4 pb-20">
        <Button 
          variant="ghost" 
          className="mb-6 pl-0 hover:bg-transparent" 
          onClick={() => navigate("/profile")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Profile
        </Button>

        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <div className="flex flex-col items-center mb-8">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-2xl">
                {username?.[0]?.toUpperCase()}
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

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          {/* Public Profile Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Public Profile</h2>
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
                placeholder="Your username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                className="resize-none min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Where do you live?</Label>
              <LocationInput
                id="location-input"
                value={location}
                onLocationSelected={(address, code) => {
                  setLocation(address);
                  if (code) {
                    setCountry(code);
                    fetchAvailablePlatforms(code);
                  }
                }}
                placeholder="e.g. New York, USA"
              />
              <p className="text-xs text-muted-foreground">
                This helps us show you where films are streaming in your region.
              </p>
            </div>

            {/* Platform Selection */}
            <div id="my-platforms" className="space-y-3 pt-2 scroll-mt-24">
              <Label>My Platforms</Label>

              {/* Active Platforms List */}
              {subscribedPlatforms.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {subscribedPlatforms.map(platformName => {
                      const provider = availablePlatforms.find(p => p.name === platformName);
                      return (
                        <div key={platformName} className="flex items-center gap-2 bg-secondary/50 pl-2 pr-1 py-1 rounded-full text-sm">
                          {provider ? (
                            <img
                              src={`https://image.tmdb.org/t/p/original${provider.logo}`}
                              alt={platformName}
                              className="w-4 h-4 rounded-sm object-cover"
                            />
                          ) : (
                            <span className="w-4 h-4 bg-muted rounded-sm" />
                          )}
                          <span>{platformName}</span>
                          <button
                            type="button"
                            onClick={() => removePlatform(platformName)}
                            className="p-1 hover:bg-secondary rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Combobox for Adding Platforms */}
              <Popover
                open={openCombobox}
                onOpenChange={(open) => {
                  if (open && !country) {
                    setOpenCombobox(false);
                    document.getElementById("location-input")?.focus();
                  } else {
                    setOpenCombobox(open);
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between"
                    disabled={loadingPlatforms}
                  >
                    {loadingPlatforms ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading providers...
                      </>
                    ) : !country ? (
                      <>
                        <Search className="mr-2 h-4 w-4 opacity-50" />
                        Please select your home location first
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4 opacity-50" />
                        Search platforms...
                      </>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  {/* FIX 5: Disable internal filtering with shouldFilter={false} */}
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search platform..."
                      autoFocus={false}
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      {filteredPlatforms.length === 0 && (
                          <CommandEmpty>No platform found.</CommandEmpty>
                      )}
                      <CommandGroup className="max-h-60 overflow-y-auto">
                        {/* FIX 6: Map over our manually filtered list */}
                        {filteredPlatforms
                          .filter(p => !subscribedPlatforms.includes(p.name))
                          .map((platform) => (
                            <CommandItem
                              key={platform.name}
                              value={platform.name}
                              onSelect={() => addPlatform(platform.name)}
                              className="cursor-pointer"
                            >
                              <img
                                src={`https://image.tmdb.org/t/p/original${platform.logo}`}
                                alt={platform.name}
                                className="w-6 h-6 rounded mr-2 object-cover"
                              />
                              {platform.name}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  subscribedPlatforms.includes(platform.name)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <p className="text-xs text-muted-foreground">
                Select the services you subscribe to. We'll highlight them on film pages.
              </p>
            </div>
          </div>

          <Separator />

          {/* App Experience Section */}
          {(isInstallable || isIOS) && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> App Experience
              </h2>
              <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                 <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Install App</h3>
                      <p className="text-sm text-muted-foreground">
                        Add Cineforum to your home screen for easier access.
                      </p>
                    </div>
                    <Button type="button" onClick={promptInstall}>
                      Install
                    </Button>
                 </div>
              </div>
              <Separator />
            </div>
          )}

          {/* Account Security Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4" /> Account & Security
            </h2>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="your@email.com"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Changing this will require verification on the new address.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
              />
            </div>
          </div>

          <Separator />

          {/* Data & Privacy Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-4 w-4" /> Data & Privacy
            </h2>
            <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Download My Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Export your ratings, reviews, and bucket list to a CSV file.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportData}
                  disabled={exporting}
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export
                </Button>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
