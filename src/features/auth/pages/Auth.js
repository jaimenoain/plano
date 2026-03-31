import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
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
import { resetPasswordSchema, signInSchema, signUpSchema, } from "@/lib/validations/auth";
export default function Auth() {
    const [searchParams] = useSearchParams();
    const invitedBy = searchParams.get("invited_by");
    const [isSignUp, setIsSignUp] = useState(!!invitedBy);
    const [isResetPassword, setIsResetPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checkEmail, setCheckEmail] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [inviterProfile, setInviterProfile] = useState(null);
    const [relatedProfiles, setRelatedProfiles] = useState([]);
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
            if (!invitedBy)
                return;
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
            }
            catch (_error) {
            }
        }
        loadInviterData();
    }, [invitedBy]);
    // Helper to generate a clean username from email
    const generateUsername = (email) => {
        const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
        const randomSuffix = Math.floor(1000 + Math.random() * 9000); // Adds 4 random digits
        return `${base}_${randomSuffix}`;
    };
    const handleSubmit = async (e) => {
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
                }
                else {
                    setCheckEmail(true);
                    toast({
                        title: "Check your email",
                        description: "We've sent you a password reset link.",
                    });
                }
            }
            else if (isSignUp) {
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
                const { error } = await signUp(signUpParsed.data.email, signUpParsed.data.password, signUpParsed.data.username, inviterId);
                if (error) {
                    if (error.message.includes("already registered")) {
                        toast({
                            variant: "destructive",
                            title: "Email already in use",
                            description: "Please sign in or use a different email.",
                        });
                    }
                    else {
                        toast({
                            variant: "destructive",
                            title: "Sign up failed",
                            description: error.message,
                        });
                    }
                }
                else {
                    setCheckEmail(true);
                    toast({
                        title: "Check your email",
                        description: "We've sent you a confirmation link.",
                    });
                }
            }
            else {
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
        }
        finally {
            setLoading(false);
        }
    };
    if (checkEmail) {
        return (_jsxs("div", { className: "min-h-screen bg-surface-default flex flex-col items-center justify-center p-4", children: [_jsx(PlanoLogo, { className: "h-8 w-auto mb-6" }), _jsxs("div", { className: "w-full max-w-sm bg-surface-card border border-border-default rounded-sm shadow-none p-8 flex flex-col gap-6 text-center", children: [_jsx("div", { className: "flex justify-center", children: _jsx("div", { className: "h-16 w-16 bg-brand-secondary/30 rounded-sm flex items-center justify-center", children: _jsx(Mail, { className: "h-8 w-8 text-brand-primary" }) }) }), _jsx("h1", { className: "text-3xl md:text-4xl font-bold tracking-tight text-text-primary", children: "Check your email" }), _jsxs("p", { className: "text-text-secondary", children: ["We've sent a ", isResetPassword ? "password reset" : "confirmation", " link to", " ", _jsx("span", { className: "font-medium text-text-primary", children: email }), ". Please check your inbox to continue."] }), _jsx(Button, { variant: "outline", className: "w-full h-10 font-medium rounded-sm", onClick: () => {
                                setCheckEmail(false);
                                setIsSignUp(false);
                                setIsResetPassword(false);
                            }, children: "Back to Sign In" })] })] }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-surface-default flex flex-col items-center justify-center p-4", children: [_jsx(PlanoLogo, { className: "h-8 w-auto mb-6" }), _jsxs("div", { className: "w-full max-w-sm bg-surface-card border border-border-default rounded-sm shadow-none p-8 flex flex-col gap-6", children: [_jsx("h1", { className: "text-3xl md:text-4xl font-bold tracking-tight text-text-primary text-center", children: isResetPassword
                            ? "Reset your password"
                            : isSignUp
                                ? "Create your account"
                                : "Welcome back" }), !isResetPassword && invitedBy && isSignUp && (inviterProfile ? (_jsxs("div", { className: "flex flex-col items-center gap-4 mb-8", children: [_jsxs("div", { className: "flex items-center justify-center pl-3", children: [relatedProfiles.map((profile) => (_jsxs(Avatar, { className: "h-10 w-10 border-2 border-surface-default -ml-3 ring-2 ring-surface-default", children: [_jsx(AvatarImage, { src: profile.avatar_url || undefined }), _jsx(AvatarFallback, { className: "text-xs bg-surface-muted", children: profile.username?.[0]?.toUpperCase() })] }, profile.id))), _jsxs(Avatar, { className: "h-14 w-14 border-2 border-surface-default -ml-3 z-10 shadow-lg ring-2 ring-surface-default", children: [_jsx(AvatarImage, { src: inviterProfile.avatar_url || undefined }), _jsx(AvatarFallback, { className: "bg-brand-secondary/30 text-brand-primary text-lg", children: inviterProfile.username?.[0]?.toUpperCase() })] })] }), _jsxs("div", { className: "text-center space-y-1", children: [_jsxs("p", { className: "text-base text-text-primary", children: ["Join ", _jsx("span", { className: "font-bold", children: inviterProfile.username }), " and others"] }), _jsx("p", { className: "text-sm text-text-secondary", children: "on PLANO" })] })] })) : (_jsxs("div", { className: "bg-brand-secondary/30 text-brand-primary px-4 py-3 rounded-sm text-sm flex items-center gap-2 border border-border-default", children: [_jsx(UserPlus, { className: "h-4 w-4 shrink-0" }), _jsxs("span", { children: [_jsx("span", { className: "font-semibold", children: invitedBy }), " invited you to join!"] })] }))), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "email", className: "text-sm text-text-secondary", children: "Email" }), _jsx(Input, { id: "email", type: "email", placeholder: "you@example.com", value: email, onChange: (e) => setEmail(e.target.value) })] }), !isResetPassword && (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "password", className: "text-sm text-text-secondary", children: "Password" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { id: "password", type: showPassword ? "text" : "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: password, onChange: (e) => setPassword(e.target.value), className: "pr-10" }), _jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary", children: showPassword ? _jsx(EyeOff, { className: "h-4 w-4" }) : _jsx(Eye, { className: "h-4 w-4" }) })] })] })), isSignUp && !isResetPassword && (_jsx("div", { className: "space-y-2", children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Checkbox, { id: "terms", checked: termsAccepted, onCheckedChange: (checked) => setTermsAccepted(checked) }), _jsxs(Label, { htmlFor: "terms", className: "text-sm text-text-secondary leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", children: ["I accept the", " ", _jsx(Link, { to: "/terms", className: "text-text-primary hover:underline decoration-brand-primary decoration-2 underline-offset-4", target: "_blank", children: "Terms and Conditions" })] })] }) })), !isResetPassword && !isSignUp && (_jsx("div", { className: "flex justify-end", children: _jsx("button", { type: "button", onClick: () => {
                                        setIsResetPassword(true);
                                    }, className: "text-xs text-text-secondary hover:text-text-primary", children: "Forgot password?" }) })), _jsx(Button, { type: "submit", className: "w-full h-10 font-medium rounded-sm bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover active:scale-[0.98]", variant: "default", disabled: loading, children: loading
                                    ? "Loading..."
                                    : isResetPassword
                                        ? "Send Reset Link"
                                        : isSignUp
                                            ? "Sign Up"
                                            : "Sign In" })] }), _jsx("p", { className: "text-center text-sm text-text-secondary", children: isResetPassword ? (_jsx("button", { type: "button", onClick: () => {
                                setIsResetPassword(false);
                            }, className: "text-text-primary hover:underline decoration-brand-primary decoration-2 underline-offset-4 font-medium", children: "Back to Sign In" })) : (_jsxs(_Fragment, { children: [isSignUp ? "Already have an account?" : "Don't have an account?", " ", _jsx("button", { type: "button", onClick: () => {
                                        setIsSignUp(!isSignUp);
                                    }, className: "text-text-primary hover:underline decoration-brand-primary decoration-2 underline-offset-4 font-medium", children: isSignUp ? "Sign In" : "Sign Up" })] })) })] })] }));
}
