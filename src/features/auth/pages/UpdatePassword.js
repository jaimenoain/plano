import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    const handleSubmit = async (e) => {
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
        }
        else {
            toast({
                title: "Password updated",
                description: "Your password has been successfully updated.",
            });
            navigate("/");
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-surface-default flex flex-col items-center justify-center p-4", children: [_jsx(PlanoLogo, { className: "h-8 w-auto mb-6" }), _jsxs("div", { className: "w-full max-w-sm bg-surface-card border border-border-default rounded-sm shadow-none p-8 flex flex-col gap-6", children: [_jsx("div", { className: "flex justify-center", children: _jsx("div", { className: "h-16 w-16 bg-brand-primary/10 rounded-sm flex items-center justify-center", children: _jsx(Lock, { className: "h-8 w-8 text-brand-primary" }) }) }), _jsx("h1", { className: "text-3xl md:text-4xl font-bold tracking-tight text-text-primary text-center", children: "Set new password" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "password", children: "New Password" }), _jsx(Input, { id: "password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", required: true })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "confirmPassword", children: "Confirm Password" }), _jsx(Input, { id: "confirmPassword", type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", required: true })] }), _jsx(Button, { type: "submit", className: "w-full h-10 font-medium rounded-sm bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover active:scale-[0.98]", disabled: loading, children: loading ? "Updating..." : "Update Password" })] })] })] }));
}
