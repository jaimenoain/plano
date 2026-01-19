import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface BlockUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
    username: string;
}

export function BlockUserDialog({ open, onOpenChange, userId, username }: BlockUserDialogProps) {
    const [reason, setReason] = useState<string>("");
    const [reportAbuse, setReportAbuse] = useState(false);
    const [details, setDetails] = useState("");
    const [loading, setLoading] = useState(false);

    const { toast } = useToast();
    const navigate = useNavigate();

    const handleBlock = async () => {
        if (!reason) {
            toast({ variant: "destructive", description: "Please select a reason for blocking." });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.rpc("block_user", {
                p_target_id: userId,
                p_reason: reason,
                p_report_abuse: reportAbuse,
                p_report_details: details || null
            });

            if (error) throw error;

            toast({ description: `Blocked ${username}.` });
            onOpenChange(false);

            // Navigate away to feed or home, as profile is now inaccessible
            navigate("/");

        } catch (error: any) {
            console.error("Error blocking user:", error);
            toast({ variant: "destructive", description: error.message || "Failed to block user." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Block {username}?
                    </DialogTitle>
                    <DialogDescription>
                        They won't be able to find your profile, posts, or story on Cineforum. They won't be notified that you blocked them.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="reason">Reason for blocking</Label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger id="reason">
                                <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="harassment">Harassment or bullying</SelectItem>
                                <SelectItem value="spam">Spam</SelectItem>
                                <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                                <SelectItem value="impersonation">Impersonation</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="report"
                            checked={reportAbuse}
                            onCheckedChange={(c) => setReportAbuse(!!c)}
                        />
                        <Label htmlFor="report" className="font-normal cursor-pointer">
                            Report abuse
                        </Label>
                    </div>

                    {reportAbuse && (
                         <div className="grid gap-2 animate-in fade-in zoom-in-95 duration-200">
                             <Label htmlFor="details">Details (optional)</Label>
                             <Textarea
                                id="details"
                                placeholder="Please provide more details..."
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                className="resize-none"
                             />
                         </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleBlock} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Block
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
