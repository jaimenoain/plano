import { Link } from "react-router";
import { BadgeCheck, Check, ExternalLink, Loader2, LogOut, Pencil, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FollowButton } from "./FollowButton";

interface HeroProfile {
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  firm?: string | null;
  website?: string | null;
}

interface ProfileHeroProps {
  profile: HeroProfile | null;
  isOwnProfile: boolean;
  targetUserId: string | null;
  isFollowing: boolean;
  verifiedArchitectId?: string | null;
  ambassadorBadge: { role: string; chapterName: string } | null;
  ambassadorProgramLabel: (role: string) => string;

  isEditingHeader: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSaveHeader: () => void;
  isSavingHeader: boolean;
  draftFirm: string;
  setDraftFirm: (value: string) => void;
  draftBio: string;
  setDraftBio: (value: string) => void;
  draftWebsite: string;
  setDraftWebsite: (value: string) => void;

  onSignOut: () => void;
}

export function ProfileHero({
  profile,
  isOwnProfile,
  targetUserId,
  isFollowing,
  verifiedArchitectId,
  ambassadorBadge,
  ambassadorProgramLabel,
  isEditingHeader,
  onStartEditing,
  onCancelEditing,
  onSaveHeader,
  isSavingHeader,
  draftFirm,
  setDraftFirm,
  draftBio,
  setDraftBio,
  draftWebsite,
  setDraftWebsite,
  onSignOut,
}: ProfileHeroProps) {
  const hasAnyHeaderContent = profile?.firm || profile?.bio || profile?.website;

  return (
    <div className="flex flex-col gap-6 pt-10 pb-2 sm:flex-row sm:items-start sm:gap-8">
      {/* Avatar — the one round element on the page */}
      <div className="shrink-0">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.username || ""}
            className="size-20 rounded-full bg-surface-muted object-cover sm:size-26"
          />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-full bg-text-primary sm:size-26">
            <span className="text-3xl font-semibold leading-none text-surface-default select-none sm:text-4xl">
              {profile?.username?.[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {/* Badges + owner/visitor actions */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex min-h-[20px] flex-wrap items-center gap-x-2 gap-y-1">
            {verifiedArchitectId && (
              <>
                <BadgeCheck className="size-3.5 shrink-0 text-text-primary" />
                <span className="eyebrow tracking-widest">Architect</span>
              </>
            )}
            {ambassadorBadge && (
              <>
                <Shield className="size-3.5 shrink-0 text-text-primary" />
                <span className="eyebrow tracking-widest">
                  {ambassadorProgramLabel(ambassadorBadge.role)} · {ambassadorBadge.chapterName}
                </span>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-5">
            {isOwnProfile ? (
              isEditingHeader ? (
                <>
                  <button
                    type="button"
                    onClick={onCancelEditing}
                    className="text-xs font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onSaveHeader}
                    disabled={isSavingHeader}
                    className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-text-primary transition-opacity hover:opacity-60 disabled:opacity-40"
                  >
                    {isSavingHeader ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onStartEditing}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center text-text-disabled transition-colors hover:text-text-primary active:text-text-primary md:min-h-0 md:min-w-0 md:p-0"
                    aria-label="Edit profile"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <Link to="/settings" className="cta-link">
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center text-text-disabled transition-colors hover:text-feedback-destructive active:text-feedback-destructive md:min-h-8 md:min-w-8"
                    aria-label="Sign out"
                  >
                    <LogOut className="size-3.5" />
                  </button>
                </>
              )
            ) : (
              targetUserId && (
                <FollowButton
                  userId={targetUserId}
                  initialIsFollowing={isFollowing}
                  className="min-h-11 px-5 text-xs sm:h-7 sm:min-h-0 sm:px-4"
                />
              )
            )}
          </div>
        </div>

        <h1 className="headline wrap-break-word">{profile?.username}</h1>

        {isEditingHeader ? (
          <div className="mt-5 max-w-sm space-y-2.5">
            {verifiedArchitectId && (
              <Input
                value={draftFirm}
                onChange={(e) => setDraftFirm(e.target.value)}
                placeholder="Practice or firm name..."
                className="h-8 border-border-default bg-transparent text-sm"
              />
            )}
            <textarea
              value={draftBio}
              onChange={(e) => setDraftBio(e.target.value)}
              placeholder="Short bio..."
              rows={3}
              className="w-full resize-none border border-border-default bg-transparent px-3 py-2 text-sm leading-relaxed text-text-primary placeholder:text-text-disabled focus:border-border-strong focus:outline-hidden"
            />
            <Input
              value={draftWebsite}
              onChange={(e) => setDraftWebsite(e.target.value)}
              placeholder="Website or portfolio URL..."
              className="h-8 border-border-default bg-transparent text-sm"
            />
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {profile?.firm && <p className="text-sm font-medium text-text-secondary">{profile.firm}</p>}
            {profile?.bio && <p className="body-relaxed max-w-[56ch] text-base">{profile.bio}</p>}
            {profile?.website && (
              <a
                href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
              >
                {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                <ExternalLink className="size-3" />
              </a>
            )}
            {isOwnProfile && !hasAnyHeaderContent && (
              <button
                type="button"
                onClick={onStartEditing}
                className="text-xs font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
              >
                + Add bio{verifiedArchitectId ? ", firm" : ""} &amp; website
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
