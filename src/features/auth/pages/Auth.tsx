import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link, type MetaFunction } from "react-router";
import { Eye, EyeOff, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import {
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations/auth";

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role?: string;
};

export const meta: MetaFunction = () => [
  { title: "Sign In | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

function safeInternalRedirect(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const invitedBy = searchParams.get("invited_by");
  const postAuthRedirect = safeInternalRedirect(searchParams.get("redirect"));
  
  const [isSignUp, setIsSignUp] = useState(!!invitedBy);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [inviterProfile, setInviterProfile] = useState<Profile | null>(null);
  const [relatedProfiles, setRelatedProfiles] = useState<Profile[]>([]);

  const { signUp, signIn, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate(postAuthRedirect ?? "/");
    }
  }, [user, navigate, postAuthRedirect]);

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
      } catch (_error) {
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
    setLoading(true);

    try {
      if (isResetPassword) {
        const resetParsed = resetPasswordSchema.safeParse({ email });
        if (!resetParsed.success) {
          toast({
            variant: "destructive",
            title: "Validation error",
            description: resetParsed.error.issues[0]?.message ?? "Invalid email",
          });
          setLoading(false);
          return;
        }

        const { error } = await resetPassword(resetParsed.data.email);
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
          toast({
            variant: "destructive",
            title: "Validation error",
            description: "You must accept the Terms and Conditions",
          });
          setLoading(false);
          return;
        }

        const autoUsername = generateUsername(email);
        const signUpParsed = signUpSchema.safeParse({
          email,
          password,
          username: autoUsername,
        });
        if (!signUpParsed.success) {
          toast({
            variant: "destructive",
            title: "Validation error",
            description: signUpParsed.error.issues[0]?.message ?? "Invalid sign-up data",
          });
          setLoading(false);
          return;
        }

        // Use the resolved inviter ID (UUID) if available, to prevent sending a username string
        // which would cause a database error if the column is of type UUID.
        const inviterId = inviterProfile?.id;

        const { error } = await signUp(
          signUpParsed.data.email,
          signUpParsed.data.password,
          signUpParsed.data.username,
          inviterId
        );
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
        const signInParsed = signInSchema.safeParse({ email, password });
        if (!signInParsed.success) {
          toast({
            variant: "destructive",
            title: "Validation error",
            description: signInParsed.error.issues[0]?.message ?? "Invalid sign-in data",
          });
          setLoading(false);
          return;
        }

        const { error } = await signIn(signInParsed.data.email, signInParsed.data.password);
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
      <div className="min-h-dvh bg-surface-default flex flex-col items-center justify-start md:justify-center overflow-y-auto safe-area-pt safe-area-pb px-4 py-4 md:py-8">
        <PlanoLogo className="text-2xl text-text-primary mb-4 md:mb-6 shrink-0" />
        <div className="w-full max-w-sm bg-surface-card border border-border-default rounded-sm shadow-none p-6 md:p-8 flex flex-col gap-4 md:gap-6 text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-brand-secondary/30 rounded-sm flex items-center justify-center">
              <Mail className="h-8 w-8 text-brand-primary" />
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-text-primary">
            Check your email
          </h1>

          <p className="text-text-secondary">
            We've sent a {isResetPassword ? "password reset" : "confirmation"} link to{" "}
            <span className="font-medium text-text-primary">{email}</span>. Please check your inbox to continue.
          </p>

          <Button
            variant="outline"
            className="w-full h-11 min-h-11 font-medium rounded-sm"
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
    <div className="min-h-dvh bg-surface-default flex flex-col items-center justify-start md:justify-center overflow-y-auto safe-area-pt safe-area-pb px-4 py-4 md:py-8">
      <PlanoLogo className="text-2xl text-text-primary mb-4 md:mb-6 shrink-0" />

      <div className="w-full max-w-sm bg-surface-card border border-border-default rounded-sm shadow-none p-6 md:p-8 flex flex-col gap-4 md:gap-6">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-text-primary text-center">
          {isResetPassword
            ? "Reset your password"
            : isSignUp
              ? "Create your account"
              : "Welcome back"}
        </h1>

        {!isResetPassword && invitedBy && isSignUp && (
          inviterProfile ? (
            <div className="flex flex-col items-center gap-4 mb-4 md:mb-8">
              <div className="flex items-center justify-center pl-3">
                {relatedProfiles.map((profile) => (
                  <Avatar key={profile.id} className="h-10 w-10 border-2 border-surface-default -ml-3 ring-2 ring-surface-default">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-surface-muted">{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                ))}

                <Avatar className="h-14 w-14 border-2 border-surface-default -ml-3 z-10 shadow-lg ring-2 ring-surface-default">
                  <AvatarImage src={inviterProfile.avatar_url || undefined} />
                  <AvatarFallback className="bg-brand-secondary/30 text-brand-primary text-lg">
                    {inviterProfile.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="text-center space-y-1">
                <p className="text-base text-text-primary">
                  Join <span className="font-bold">{inviterProfile.username}</span> and others
                </p>
                <p className="text-sm text-text-secondary">on PLANO</p>
              </div>
            </div>
          ) : (
            <div className="bg-brand-secondary/30 text-brand-primary px-4 py-3 rounded-sm text-sm flex items-center gap-2 border border-border-default">
              <UserPlus className="h-4 w-4 shrink-0" />
              <span>
                <span className="font-semibold">{invitedBy}</span> invited you to join!
              </span>
            </div>
          )
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-text-secondary">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {!isResetPassword && (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-text-secondary">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
                  className="text-sm text-text-secondary leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I accept the{" "}
                  <Link
                    to="/terms"
                    className="text-text-primary hover:underline decoration-brand-primary decoration-2 underline-offset-4"
                    target="_blank"
                  >
                    Terms and Conditions
                  </Link>
                </Label>
              </div>
            </div>
          )}

          {!isResetPassword && !isSignUp && (
            <div className="flex justify-end">
               <button
                 type="button"
                 onClick={() => {
                   setIsResetPassword(true);
                 }}
                 className="text-xs text-text-secondary hover:text-text-primary"
               >
                 Forgot password?
               </button>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 min-h-11 font-medium rounded-sm bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover active:scale-[0.98]"
            variant="default"
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

        <p className="text-center text-sm text-text-secondary">
          {isResetPassword ? (
            <button
              type="button"
              onClick={() => {
                setIsResetPassword(false);
              }}
              className="text-text-primary hover:underline decoration-brand-primary decoration-2 underline-offset-4 font-medium"
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
                }}
                className="text-text-primary hover:underline decoration-brand-primary decoration-2 underline-offset-4 font-medium"
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
