export interface MobileTopBarProps {
  /** Signed-in shows bell + avatar; signed-out shows "Join list" + "Log in". Default true. */
  signedIn?: boolean;
  /** Fallback avatar initial when no image. Default "A". */
  userInitial?: string;
  /** Avatar image URL; overrides the initial. */
  avatarUrl?: string;
  /** Show the lime unread dot on the bell (signed-in only). Default true. */
  hasNotification?: boolean;
}

/** Mobile top bar — hamburger, centred wordmark, right-hand actions. */
export declare function MobileTopBar(props: MobileTopBarProps): JSX.Element;
