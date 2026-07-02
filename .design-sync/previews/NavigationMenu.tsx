import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from 'plano';

// NavigationMenu opens its content into an absolutely-positioned Radix viewport
// whose height is measured from live content (--radix-navigation-menu-viewport-
// height). Forcing it open statically collapses that height to 0, so the panel
// renders empty. We therefore show the closed navigation BAR with all triggers
// and links visible — a valid, fully-styled composition. See learnings/batchD.md.
export const ArchiveNav = () => (
  <NavigationMenu>
    <NavigationMenuList>
      <NavigationMenuItem value="explore">
        <NavigationMenuTrigger>Explore</NavigationMenuTrigger>
      </NavigationMenuItem>
      <NavigationMenuItem value="cities">
        <NavigationMenuTrigger>Cities</NavigationMenuTrigger>
      </NavigationMenuItem>
      <NavigationMenuItem value="architects">
        <NavigationMenuTrigger>Architects</NavigationMenuTrigger>
      </NavigationMenuItem>
      <NavigationMenuItem value="archive">
        <NavigationMenuLink className={navigationMenuTriggerStyle()} href="#">
          Archive
        </NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenu>
);
