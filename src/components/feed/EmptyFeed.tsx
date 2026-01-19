import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6">
        <Users className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Welcome to Cineforum
      </h2>
      <p className="text-muted-foreground mb-6 max-w-xs">
        Your feed is empty. Follow other movie lovers to see their reviews and watchlists.
      </p>
      <Button asChild className="bg-primary hover:bg-primary/90">
        <Link to="/search?tab=users">
          Find Movie Lovers
        </Link>
      </Button>
    </div>
  );
}
