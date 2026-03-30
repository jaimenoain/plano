import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Permission Denied</h1>
      <p className="text-muted-foreground max-w-md">
        You do not have permission to access the Admin Console. If you believe this is an error, please contact the system administrator.
      </p>
      <div className="flex gap-4">
        <Link to="/">
          <Button variant="outline">Return Home</Button>
        </Link>
      </div>
    </div>
  );
}
