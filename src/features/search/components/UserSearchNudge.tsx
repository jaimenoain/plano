import { UserSearchResult } from "../hooks/useUserSearch";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface UserSearchNudgeProps {
  users: UserSearchResult[];
  onSingleMatch: (username: string) => void;
  onMultipleMatch: () => void;
}

export function UserSearchNudge({ users, onSingleMatch, onMultipleMatch }: UserSearchNudgeProps) {
  if (users.length === 0) return null;

  const getAvatarUrl = (user: UserSearchResult) => {
     if (!user.avatar_url) return undefined;
     return user.avatar_url.startsWith("http")
        ? user.avatar_url
        : supabase.storage.from("avatars").getPublicUrl(user.avatar_url).data.publicUrl;
  };

  if (users.length === 1) {
    const user = users[0];
    return (
      <div className="px-4 py-2 animate-in fade-in slide-in-from-top-2">
        <Card className="bg-muted/50 border-dashed hover:bg-muted transition-colors cursor-pointer group" onClick={() => user.username && onSingleMatch(user.username)}>
          <CardContent className="flex items-center gap-3 p-3">
             <Avatar className="h-8 w-8 border">
                <AvatarImage src={getAvatarUrl(user)} />
                <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
             </Avatar>
             <div className="flex-1">
                <p className="text-sm font-medium">Looking for <span className="text-primary font-semibold group-hover:underline">{user.username}</span>?</p>
             </div>
             <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground group-hover:text-foreground">View Profile</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Multiple matches
  return (
    <div className="px-4 py-2 animate-in fade-in slide-in-from-top-2">
      <Card className="bg-muted/50 border-dashed hover:bg-muted transition-colors cursor-pointer group" onClick={onMultipleMatch}>
        <CardContent className="flex items-center gap-3 p-3">
           <div className="flex -space-x-2 overflow-hidden pl-1">
             {users.slice(0, 3).map((user) => (
               <Avatar key={user.id} className="inline-block h-8 w-8 ring-2 ring-background border">
                 <AvatarImage src={getAvatarUrl(user)} />
                 <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
               </Avatar>
             ))}
           </div>
           <div className="flex-1">
              <p className="text-sm font-medium">{users.length} people found matching your search</p>
           </div>
           <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground group-hover:text-foreground">View All</Button>
        </CardContent>
      </Card>
    </div>
  );
}
