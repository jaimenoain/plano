import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button } from 'plano';

// The base Card is intentionally borderless (editorial). Call-sites that need
// chrome add a hairline via className — shown here in the "Bordered" story.
export const Editorial = () => (
  <Card style={{ maxWidth: 360 }}>
    <CardHeader>
      <CardDescription>Project · 1962</CardDescription>
      <CardTitle>Villa Saarinen</CardTitle>
    </CardHeader>
    <CardContent>
      <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        A monolithic concrete residence set into the Finnish hillside, its cantilevered
        volumes framing the lake below.
      </p>
    </CardContent>
    <CardFooter style={{ gap: 12 }}>
      <Button size="sm">View building</Button>
      <Button size="sm" variant="ghost">Save</Button>
    </CardFooter>
  </Card>
);

export const Bordered = () => (
  <Card style={{ maxWidth: 360, border: '1px solid var(--border-default)', borderRadius: 2 }}>
    <CardHeader>
      <CardTitle>Notifications</CardTitle>
      <CardDescription>You have 3 unread messages</CardDescription>
    </CardHeader>
    <CardContent>
      <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        Enable push notifications to get updates when a building you follow is edited.
      </p>
    </CardContent>
    <CardFooter>
      <Button size="sm">Turn on notifications</Button>
    </CardFooter>
  </Card>
);
