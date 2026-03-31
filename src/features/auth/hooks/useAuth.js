import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isValidRedirect } from "@/lib/security";
export const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    // We need a ref to access the *current* state value inside the callback closure
    // without adding it to the dependency array (which would re-subscribe).
    const currentUserRef = useRef(null);
    useEffect(() => {
        // Sync ref with state
        currentUserRef.current = user;
    }, [user]);
    useEffect(() => {
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // Only update state on relevant events to prevent accidental sign-outs
            // or race conditions.
            const shouldUpdate = event === 'SIGNED_IN' ||
                event === 'TOKEN_REFRESHED' ||
                event === 'USER_UPDATED' ||
                event === 'INITIAL_SESSION' ||
                event === 'SIGNED_OUT';
            if (!shouldUpdate)
                return;
            if (event === 'SIGNED_OUT') {
                setSession(null);
                setUser(null);
                setLoading(false);
                return;
            }
            const newUser = session?.user ?? null;
            setSession(session);
            // Deep comparison to prevent unnecessary re-renders
            // We compare the stringified versions to catch metadata updates
            // while ignoring simple object reference changes.
            const prevUser = currentUserRef.current;
            const prevUserStr = prevUser ? JSON.stringify(prevUser) : "";
            const newUserStr = newUser ? JSON.stringify(newUser) : "";
            if (prevUserStr !== newUserStr) {
                setUser(newUser);
            }
            setLoading(false);
        });
        return () => subscription.unsubscribe();
    }, []);
    const signUp = async (email, password, username, invitedBy) => {
        const redirectUrl = "https://plano.app/";
        // Validate redirect URL to prevent open redirect vulnerabilities
        if (!isValidRedirect(redirectUrl)) {
            return { error: new Error("Security validation failed") };
        }
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: redirectUrl,
                data: {
                    username,
                    invited_by: invitedBy,
                },
            },
        });
        return { error };
    };
    const signIn = async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };
    const signOut = async () => {
        await supabase.auth.signOut();
    };
    const resetPassword = async (email) => {
        const redirectUrl = "https://plano.app/update-password";
        // Validate redirect URL to prevent open redirect vulnerabilities
        if (!isValidRedirect(redirectUrl)) {
            return { error: new Error("Security validation failed") };
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
        });
        return { error };
    };
    const updatePassword = async (password) => {
        const { error } = await supabase.auth.updateUser({
            password: password,
        });
        return { error };
    };
    return (_jsx(AuthContext.Provider, { value: { user, session, loading, signUp, signIn, signOut, resetPassword, updatePassword }, children: children }));
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
