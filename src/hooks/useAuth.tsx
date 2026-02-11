import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isValidRedirect } from "@/lib/security";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string, invitedBy?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // We need a ref to access the *current* state value inside the callback closure
  // without adding it to the dependency array (which would re-subscribe).
  const currentUserRef = useRef<User | null>(null);

  useEffect(() => {
    // Sync ref with state
    currentUserRef.current = user;
  }, [user]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only update state on relevant events to prevent accidental sign-outs
        // or race conditions.
        const shouldUpdate =
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED' ||
          event === 'INITIAL_SESSION' ||
          event === 'SIGNED_OUT';

        if (!shouldUpdate) return;

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
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string, invitedBy?: string) => {
    const redirectUrl = "https://plano.app/";
    
    // Validate redirect URL to prevent open redirect vulnerabilities
    if (!isValidRedirect(redirectUrl)) {
      console.error("Invalid redirect URL generated");
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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
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

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
