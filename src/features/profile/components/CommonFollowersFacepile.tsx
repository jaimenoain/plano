import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SimpleProfile } from "@/features/profile/hooks/useProfileComparison";
import { Link } from "react-router";

interface CommonFollowersFacepileProps {
  users: SimpleProfile[];
  count: number;
}

export function CommonFollowersFacepile({ users, count }: CommonFollowersFacepileProps) {
  if (!users || users.length === 0) return null;

  let textContent;

  // Helper to wrap name
  const Name = ({ user }: { user: SimpleProfile }) => (
      <span className="font-semibold text-text-primary">{user.username}</span>
  );

  if (count === 1) {
      textContent = <>Followed by <Name user={users[0]} /></>;
  } else if (count === 2) {
       // Ensure we have 2 users
       if (users.length >= 2) {
           textContent = <>Followed by <Name user={users[0]} /> and <Name user={users[1]} /></>;
       } else {
           // Fallback if data is missing
           textContent = <>Followed by <Name user={users[0]} /> +1</>;
       }
  } else {
      // 3 or more
      if (users.length >= 2) {
           const remaining = count - 2;
           textContent = (
               <>
                 Followed by <Name user={users[0]} />, <Name user={users[1]} />
                 {remaining > 0 && <span className="font-semibold text-text-primary"> +{remaining}</span>}
               </>
           );
      } else {
           textContent = <>Followed by {count} connections</>;
      }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border-default/40 bg-surface-card/30">
      <div className="flex -space-x-2 overflow-hidden">
        {users.slice(0, 3).map((user) => (
          <Link key={user.id} to={`/profile/${user.username || user.id}`}>
             <Avatar className="inline-block h-8 w-8 rounded-full ring-2 ring-surface-default">
                <AvatarImage src={user.avatar_url || undefined} alt={user.username || "User"} />
                <AvatarFallback className="text-[10px]">{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
             </Avatar>
          </Link>
        ))}
      </div>
      <div className="text-sm text-text-secondary">
          {textContent}
      </div>
    </div>
  );
}
