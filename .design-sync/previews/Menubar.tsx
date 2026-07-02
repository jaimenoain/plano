import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarCheckboxItem,
} from 'plano';

export const ArchiveMenubar = () => (
  <Menubar defaultValue="view">
    <MenubarMenu value="record">
      <MenubarTrigger>Record</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>New building <MenubarShortcut>N</MenubarShortcut></MenubarItem>
        <MenubarItem>Import archive <MenubarShortcut>I</MenubarShortcut></MenubarItem>
        <MenubarSeparator />
        <MenubarItem>Export record</MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <MenubarMenu value="view">
      <MenubarTrigger>View</MenubarTrigger>
      <MenubarContent>
        <MenubarCheckboxItem checked>Show map pins</MenubarCheckboxItem>
        <MenubarCheckboxItem>Show demolished</MenubarCheckboxItem>
        <MenubarSeparator />
        <MenubarItem>Satellite layer <MenubarShortcut>L</MenubarShortcut></MenubarItem>
        <MenubarItem>Fit to city bounds</MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <MenubarMenu value="architect">
      <MenubarTrigger>Architect</MenubarTrigger>
      <MenubarContent>
        <MenubarItem>Aarne Ervi</MenubarItem>
        <MenubarItem>Alvar Aalto</MenubarItem>
        <MenubarItem>Reima Pietilä</MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  </Menubar>
);
