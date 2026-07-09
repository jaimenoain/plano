export interface AppTopNavProps {
  /** Signed-in shows avatar + notifications + "Log a visit"; signed-out shows "Join the waiting list". Default true. */
  signedIn?: boolean;
  /** Current route, used to mark the active nav link (e.g. "/", "/explore"). Default "/". */
  activePath?: string;
  /** Fallback avatar initial when no image. Default "A". */
  userInitial?: string;
  /** Avatar image URL; overrides the initial. */
  avatarUrl?: string;
  /** Show the lime unread dot on the bell (signed-in only). Default true. */
  hasNotification?: boolean;
}

/** Desktop sticky top navigation for Plano surfaces. */
export declare function AppTopNav(props: AppTopNavProps): JSX.Element;
