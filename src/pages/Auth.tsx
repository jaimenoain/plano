import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Eye, EyeOff, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// Removed username requirement from sign-up schema
const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role?: string;
};

export default function Auth() {
  const [searchParams] = useSearchParams();
  const invitedBy = searchParams.get("invited_by");
  
  const [isSignUp, setIsSignUp] = useState(!!invitedBy);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkEmail, setCheckEmail] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [inviterProfile, setInviterProfile] = useState<Profile | null>(null);
  const [relatedProfiles, setRelatedProfiles] = useState<Profile[]>([]);

  const { signUp, signIn, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      // CHANGED: Redirect to home instead of onboarding. 
      // The home page (Index.tsx) will handle the onboarding check.
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    async function loadInviterData() {
      if (!invitedBy) return;
      try {
        const { data: inviter } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('username', invitedBy)
          .single();

        if (inviter) {
          setInviterProfile(inviter);

          const { data: profiles } = await supabase
            .rpc("get_inviter_facepile", {
              inviter_id: inviter.id
            });

          if (profiles) {
            // The RPC returns { id, username, avatar_url } which matches our Profile type
            setRelatedProfiles(profiles);
          }
        }
      } catch (error) {
        console.error("Error fetching inviter details:", error);
      }
    }
    loadInviterData();
  }, [invitedBy]);

  // Helper to generate a clean username from email
  const generateUsername = (email: string) => {
    const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000); // Adds 4 random digits
    return `${base}_${randomSuffix}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (isResetPassword) {
        if (!email) {
           setErrors({ email: "Email is required" });
           setLoading(false);
           return;
        }

        const { error } = await resetPassword(email);
        if (error) {
          toast({
             variant: "destructive",
             title: "Error sending reset link",
             description: error.message,
          });
        } else {
           setCheckEmail(true);
           toast({
             title: "Check your email",
             description: "We've sent you a password reset link.",
           });
        }
      } else if (isSignUp) {
        if (!termsAccepted) {
          setErrors({ terms: "You must accept the Terms and Conditions" });
          setLoading(false);
          return;
        }

        const result = signUpSchema.safeParse({ email, password });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        // Auto-generate the username here
        const autoUsername = generateUsername(email);

        const { error } = await signUp(email, password, autoUsername, invitedBy || undefined);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              variant: "destructive",
              title: "Email already in use",
              description: "Please sign in or use a different email.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Sign up failed",
              description: error.message,
            });
          }
        } else {
          setCheckEmail(true);
          toast({
            title: "Check your email",
            description: "We've sent you a confirmation link.",
          });
        }
      } else {
        const result = signInSchema.safeParse({ email, password });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          toast({
            variant: "destructive",
            title: "Sign in failed",
            description: "Invalid email or password.",
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="flex items-center gap-3 mb-10">
          <img src="/logo.png" alt="Cineforum" className="h-10 w-10" />
          <span className="text-2xl font-bold tracking-tight text-foreground">
            Cineforum
          </span>
        </div>

        <div className="w-full max-w-sm text-center space-y-6">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <h1 className="text-xl font-semibold text-foreground">
            Check your email
          </h1>
          
          <p className="text-muted-foreground">
            We've sent a {isResetPassword ? "password reset" : "confirmation"} link to <span className="font-medium text-foreground">{email}</span>.
            Please check your inbox to continue.
          </p>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              setCheckEmail(false);
              setIsSignUp(false);
              setIsResetPassword(false);
            }}
          >
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-3 mb-10">
        <img src="/logo.png" alt="Cineforum" className="h-10 w-10" />
        <span className="text-2xl font-bold tracking-tight text-foreground">
          Cineforum
        </span>
      </div>

      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-foreground text-center mb-6">
          {isResetPassword
            ? "Reset your password"
            : isSignUp
              ? "Create your account"
              : "Welcome back"}
        </h1>

        {!isResetPassword && invitedBy && isSignUp && (
          inviterProfile ? (
            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="flex items-center justify-center pl-3">
                {relatedProfiles.map((profile) => (
                  <Avatar key={profile.id} className="h-10 w-10 border-2 border-background -ml-3 ring-2 ring-background">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-muted">{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                ))}
                
                <Avatar className="h-14 w-14 border-2 border-background -ml-3 z-10 shadow-lg ring-2 ring-background">
                  <AvatarImage src={inviterProfile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-lg">{inviterProfile.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>

              <div className="text-center space-y-1">
                <p className="text-base text-foreground">
                  Join <span className="font-bold">{inviterProfile.username}</span> and others
                </p>
                <p className="text-sm text-muted-foreground">on Cineforum</p>
              </div>
            </div>
          ) : (
            <div className="bg-primary/10 text-primary px-4 py-3 rounded-md mb-6 text-sm flex items-center gap-2 border border-primary/20">
              <UserPlus className="h-4 w-4 shrink-0" />
              <span>
                <span className="font-semibold">{invitedBy}</span> invited you to join!
              </span>
            </div>
          )
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-secondary border-border focus:border-primary"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          {!isResetPassword && (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-muted-foreground">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary border-border focus:border-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>
          )}

          {isSignUp && !isResetPassword && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                />
                <Label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I accept the <Link to="/terms" className="text-primary hover:underline" target="_blank">Terms and Conditions</Link>
                </Label>
              </div>
              {errors.terms && (
                <p className="text-xs text-destructive">{errors.terms}</p>
              )}
            </div>
          )}

          {!isResetPassword && !isSignUp && (
            <div className="flex justify-end">
               <button
                 type="button"
                 onClick={() => {
                   setIsResetPassword(true);
                   setErrors({});
                 }}
                 className="text-xs text-muted-foreground hover:text-foreground"
               >
                 Forgot password?
               </button>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={loading}
          >
            {loading
              ? "Loading..."
              : isResetPassword
                ? "Send Reset Link"
                : isSignUp
                  ? "Sign Up"
                  : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isResetPassword ? (
             <button
               type="button"
               onClick={() => {
                 setIsResetPassword(false);
                 setErrors({});
               }}
               className="text-primary hover:underline font-medium"
             >
               Back to Sign In
             </button>
          ) : (
             <>
               {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
               <button
                 type="button"
                 onClick={() => {
                   setIsSignUp(!isSignUp);
                   setErrors({});
                 }}
                 className="text-primary hover:underline font-medium"
               >
                 {isSignUp ? "Sign In" : "Sign Up"}
               </button>
             </>
          )}
        </p>
      </div>
    </div>
  );
}
