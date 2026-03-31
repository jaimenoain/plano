import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";
import { updatePasswordSchema } from "@/lib/validations/auth";
import { PlanoLogo } from "@/components/common/PlanoLogo";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = updatePasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: parsed.error.issues[0]?.message ?? "Invalid password",
      });
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(parsed.data.password);
    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated.",
      });
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-surface-default flex flex-col items-center justify-center p-4">
      <PlanoLogo className="h-8 w-auto mb-6" />
      <div className="w-full max-w-sm bg-surface-card border border-border-default rounded-sm shadow-none p-8 flex flex-col gap-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-brand-primary/10 rounded-sm flex items-center justify-center">
            <Lock className="h-8 w-8 text-brand-primary" />
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary text-center">
          Set new password
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-10 font-medium rounded-sm bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
