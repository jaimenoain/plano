import { Tabs, TabsList, TabsTrigger, TabsContent } from 'plano';

const body: React.CSSProperties = { fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)', maxWidth: 420 };

export const Default = () => (
  <Tabs defaultValue="overview" style={{ width: 440 }}>
    <TabsList>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="photography">Photography</TabsTrigger>
      <TabsTrigger value="records">Records</TabsTrigger>
    </TabsList>
    <TabsContent value="overview">
      <p style={body}>
        Villa Saarinen, completed 1962 by Eero Saarinen. A monolithic concrete residence
        set into the Finnish hillside.
      </p>
    </TabsContent>
    <TabsContent value="photography">
      <p style={body}>142 archival photographs spanning 1962–1998, digitised from the studio archive.</p>
    </TabsContent>
    <TabsContent value="records">
      <p style={body}>Original planning permits and structural drawings held by the Helsinki city archive.</p>
    </TabsContent>
  </Tabs>
);

export const TwoTabs = () => (
  <Tabs defaultValue="architect" style={{ width: 380 }}>
    <TabsList>
      <TabsTrigger value="architect">Architect</TabsTrigger>
      <TabsTrigger value="city">City</TabsTrigger>
    </TabsList>
    <TabsContent value="architect">
      <p style={body}>Alvar Aalto — 84 catalogued works across Finland, Germany and the United States.</p>
    </TabsContent>
    <TabsContent value="city">
      <p style={body}>Helsinki — 1,240 recorded structures, 38 of them Aalto commissions.</p>
    </TabsContent>
  </Tabs>
);

export const Disabled = () => (
  <Tabs defaultValue="published" style={{ width: 440 }}>
    <TabsList>
      <TabsTrigger value="published">Published</TabsTrigger>
      <TabsTrigger value="drafts">Drafts</TabsTrigger>
      <TabsTrigger value="archived" disabled>Archived</TabsTrigger>
    </TabsList>
    <TabsContent value="published">
      <p style={body}>28 building records live in the public archive.</p>
    </TabsContent>
    <TabsContent value="drafts">
      <p style={body}>4 records awaiting review before publication.</p>
    </TabsContent>
  </Tabs>
);
