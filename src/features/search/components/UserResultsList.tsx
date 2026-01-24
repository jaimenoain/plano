import { UserSearchResult } from "../hooks/useUserSearch";
import { UserRow } from "@/components/connect/UserRow";
import { Skeleton } from "@/components/ui/skeleton";

interface UserResultsListProps {
  users: UserSearchResult[];
  isLoading: boolean;
}

export function UserResultsList({ users, isLoading }: UserResultsListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-2">
               <Skeleton className="h-4 w-32" />
               <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <p>No users found matching your search.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {users.map((user) => (
        <UserRow key={user.id} user={user} />
      ))}
    </div>
  );
}
