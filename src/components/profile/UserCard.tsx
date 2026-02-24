import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, MoreHorizontal, UserPlus, UserCheck, PlayCircle, Ban } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { BlockUserDialog } from "./BlockUserDialog";
import { AddBuildingDialog } from "./AddBuildingDialog";

interface Profile {
    id: string;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    last_online?: string | null;
    role?: string;
}

interface Stats {
    reviews: number;
    pending: number;
    followers: number;
    following: number;
    photos: number;
    maps: number;
}

interface UserCardProps {
    profile: Profile | null;
    stats: Stats;
    isOwnProfile: boolean;
    isFollowing: boolean;
    onFollowToggle: () => void;
    onSignOut: () => void;
    onOpenUserList: (type: "followers" | "following") => void;
    onTabChange: (tab: string) => void;
    onBuildingAdded?: () => void;
    squad?: Profile[];
}

export function UserCard({
    profile,
    stats,
    isOwnProfile,
    isFollowing,
    onFollowToggle,
    onSignOut,
    onOpenUserList,
    onTabChange,
    onBuildingAdded,
    squad = []
}: UserCardProps) {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [showBlockDialog, setShowBlockDialog] = useState(false);

    const totalBuildings = stats.reviews + stats.pending;

    return (
        <div className="px-4 py-6 md:py-10 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-center">

                {/* Avatar Section */}
                <div className="shrink-0 mx-auto md:mx-0">
                    <Avatar className="h-24 w-24 md:h-40 md:w-40 border-2 border-border shadow-sm">
                        <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                        <AvatarFallback className="text-3xl bg-secondary">{profile?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </div>

                {/* Info Section */}
                <div className="flex-1 min-w-0 w-full">
                    {/* Top Row: Name + Actions */}
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-4 md:mb-6">
                        <h1 className="text-xl md:text-2xl font-bold truncate max-w-[200px] md:max-w-none">
                            {profile?.username}
                        </h1>

                        <div className="flex items-center gap-2">
                            {isOwnProfile ? (
                                <>
                                    <Button variant="secondary" size="sm" onClick={() => navigate("/settings")} className="h-8">
                                        Edit profile
                                    </Button>
                                    <AddBuildingDialog onBuildingAdded={onBuildingAdded} />
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                             <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                             </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={onSignOut} className="text-destructive">
                                                <LogOut className="mr-2 h-4 w-4" /> Sign Out
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            ) : (
                                <>
                                    <Button
                                        onClick={onFollowToggle}
                                        variant={isFollowing ? "secondary" : "default"}
                                        size="sm"
                                        className="h-8 px-5 font-semibold"
                                    >
                                        {isFollowing ? "Following" : "Follow"}
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                             <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                             </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setShowBlockDialog(true)} className="text-destructive">
                                                <Ban className="mr-2 h-4 w-4" /> Block User
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            )}
                        </div>
                    </div>

                    {profile && !isOwnProfile && (
                        <BlockUserDialog
                            open={showBlockDialog}
                            onOpenChange={setShowBlockDialog}
                            userId={profile.id}
                            username={profile.username || "this user"}
                        />
                    )}

                    {/* Stats Row */}
                    <div className="flex flex-wrap items-center justify-start gap-x-6 gap-y-2 md:gap-10 mb-5 px-2 md:px-0 border-y md:border-none py-3 md:py-0 border-border/40">
                        <StatItem label="edificios" value={totalBuildings} onClick={() => onTabChange("all")} />
                        <StatItem
                            label="photos"
                            value={stats.photos}
                            onClick={() => {
                                if (isOwnProfile) {
                                    navigate("/profile/photos");
                                } else if (profile?.username) {
                                    navigate(`/profile/${profile.username}/photos`);
                                } else if (profile?.id) {
                                    navigate(`/profile/${profile.id}/photos`);
                                }
                            }}
                        />
                        <StatItem label="maps" value={stats.maps} onClick={() => document.getElementById('collections-section')?.scrollIntoView({ behavior: 'smooth' })} />
                        <StatItem label="followers" value={stats.followers} onClick={() => onOpenUserList("followers")} />
                        <StatItem label="following" value={stats.following} onClick={() => onOpenUserList("following")} />
                    </div>

                    {/* Bio & Online Status */}
                    <div className="text-center md:text-left px-2 md:px-0">
                         {profile?.bio && (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap mb-2">
                                {profile.bio}
                            </p>
                        )}

                         {profile?.last_online && (
                            <p className="text-[10px] text-muted-foreground font-medium inline-flex items-center gap-1.5">
                                <span className={cn("w-1.5 h-1.5 rounded-full",
                                new Date(profile.last_online).getTime() > Date.now() - 1000 * 60 * 10 ? "bg-green-500" : "bg-muted-foreground/30"
                                )} />
                                {new Date(profile.last_online).getTime() > Date.now() - 1000 * 60 * 10
                                ? "Online"
                                : `Seen ${formatDistanceToNow(new Date(profile.last_online), { addSuffix: true })}`}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatItem({ label, value, onClick }: { label: string, value: number, onClick: () => void }) {
    return (
        <button onClick={onClick} className="flex flex-col md:flex-row items-center gap-1 group">
            <span className="font-bold text-base md:text-md text-foreground group-hover:text-primary transition-colors">
                {formatStatValue(value)}
            </span>
            <span className="text-xs md:text-sm text-muted-foreground capitalize">
                {label}
            </span>
        </button>
    )
}

function formatStatValue(value: number): string {
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    }
    if (value >= 1000) {
        return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return value.toString();
}
