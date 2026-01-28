import React from "react";
import { CheckCircle2, List, UserPlus } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const LandingFeatureGrid = () => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {/* Card 1: Log Your Journey */}
      <Card className="flex flex-col border-border bg-card shadow-sm transition-all hover:shadow-md">
        <CardHeader>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold">Log Your Journey</CardTitle>
          <CardDescription>
            Keep track of every architectural masterpiece you've visited.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
          <div className="relative overflow-hidden rounded-md border border-border bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-16 rounded bg-muted-foreground/20" />
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-muted-foreground/20" />
                <div className="h-3 w-16 rounded bg-muted-foreground/20" />
              </div>
              <CheckCircle2 className="ml-auto h-5 w-5 text-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Curate Lists */}
      <Card className="flex flex-col border-border bg-card shadow-sm transition-all hover:shadow-md">
        <CardHeader>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <List className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold">Curate Lists</CardTitle>
          <CardDescription>
            Organize your favorites into collections like "Brutalist Gems".
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
          <div className="space-y-2 rounded-md border border-border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Brutalist Gems</div>
              <div className="text-xs text-muted-foreground">12 items</div>
            </div>
            <div className="flex -space-x-2">
               {[1, 2, 3].map((i) => (
                <div key={i} className="h-6 w-6 rounded-full border border-background bg-muted-foreground/30" />
               ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Follow Architects */}
      <Card className="flex flex-col border-border bg-card shadow-sm transition-all hover:shadow-md">
        <CardHeader>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold">Follow Architects</CardTitle>
          <CardDescription>
            Stay updated with works from legends like Le Corbusier.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 p-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted-foreground/20" />
                <div className="text-sm font-medium">Le Corbusier</div>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs">
                Follow
              </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};
