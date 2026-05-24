import { useState } from "react";
import { useNavigate, type MetaFunction } from "react-router";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updatePasswordSchema } from "@/lib/validations/auth";
import { PlanoLogo } from "@/components/common/PlanoLogo";

export const meta: MetaFunction = () => [
  { title: "Update Password | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

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
    <div className="min-h-dvh w-full flex-1 bg-surface-default flex flex-col items-center justify-start md:justify-center overflow-y-auto safe-area-pt safe-area-pb px-4 py-4 md:py-8">
      <div className="w-full max-w-sm flex flex-col items-center gap-4 md:gap-6">
        <PlanoLogo className="text-2xl text-text-primary shrink-0" />
        <div className="w-full bg-surface-card border border-border-default rounded-sm shadow-none p-6 md:p-8 flex flex-col gap-4 md:gap-6">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-text-primary text-center">
            Set new password
          </h1>
          <p className="text-center text-sm text-text-secondary">
            Choose a strong password you have not used elsewhere.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-text-secondary">
                New password
              </Label>
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
              <Label htmlFor="confirmPassword" className="text-sm text-text-secondary">
                Confirm password
              </Label>
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
              className="w-full h-11 min-h-11 font-medium rounded-sm bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
