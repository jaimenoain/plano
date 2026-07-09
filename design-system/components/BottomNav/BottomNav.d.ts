export interface BottomNavProps {
  /** Current route, marks the active tab (e.g. "/", "/explore", "/profile"). Default "/". */
  activePath?: string;
  /** "default" (light) or "inverse" (pitch-black, used over the Explore feed). Default "default". */
  variant?: 'default' | 'inverse';
}

/** Mobile bottom tab bar for Plano. */
export declare function BottomNav(props: BottomNavProps): JSX.Element;
