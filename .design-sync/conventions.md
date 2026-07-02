# Plano UI — how to build with this library

Plano is an editorial, photography-first, **monochrome** design system for the world's architecture. Black, white, and neutral greys; sharp corners; borders instead of shadows; **Inter** for text and **Space Mono** for labels/eyebrows/numerals. No emoji (use Lucide icons), no serif, no gradients on UI. The lime **`brand-accent` (#BEFF00)** appears in exactly two places — text `::selection` and the notification dot — never as a component fill.

Import every component from the library namespace (e.g. `import { Button, Card, CardHeader } from '<pkg>'`). Compound components ship their parts as sibling exports (`Card` → `CardHeader`/`CardTitle`/`CardContent`/`CardFooter`; `Dialog` → `DialogTrigger`/`DialogContent`/…).

## Providers & setup

Most components render standalone — no wrapper needed. The exceptions:

- **Tooltip** — wrap the subtree once in `TooltipProvider`, then `Tooltip` + `TooltipTrigger` + `TooltipContent`.
- **Sidebar** — wrap `Sidebar` + your main content in `SidebarProvider`.
- **Toaster** — mount `<Toaster />` once near the app root; fire toasts with `toast(...)`, `toast.success(...)`, `toast.error(...)` (all exported from the library).
- **Form** — react-hook-form based: create `useForm()`, wrap in `<Form {...form}>`, and compose `FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage`.
- **ChartContainer** — pass a `config` mapping each series key to `{ label, color }`; reference the color inside Recharts as `var(--color-<key>)`.

## Styling idiom — semantic token utility classes ONLY

Style with Tailwind utility classes that map to the design tokens. **Never** use raw palette classes (`bg-blue-500`, `bg-gray-100`, `text-red-600`) — they break the monochrome brand. Use these token classes (prefix with `bg-`/`text-`/`border-`):

| Family | Classes |
|---|---|
| Surfaces | `surface-default`, `surface-card`, `surface-overlay`, `surface-muted`, `surface-inverse` |
| Brand | `brand-primary` (near-black #171717) + `brand-primary-foreground` (white) + `brand-primary-hover`; `brand-secondary` (+`-foreground`); `brand-accent` (lime — selection/dot only) |
| Text | `text-primary`, `text-secondary`, `text-disabled`, `text-inverse` |
| Borders | `border-default` (#E5E5E5 hairline), `border-strong` |
| Feedback | `feedback-success`, `feedback-warning`, `feedback-destructive` (+`-foreground`) |

The shadcn semantic aliases also resolve to the same tokens: `bg-primary`, `bg-card`, `bg-popover`, `bg-muted`, `bg-accent`, `bg-secondary`, `bg-destructive`, `text-foreground`, `border-border`.

Radius: `rounded-sm` (2px) is the primitive default; use `rounded-none` on photography and editorial chrome; `rounded-full` only for avatars and dot markers. Type: default is Inter; add `font-mono` for the 11px uppercase tracked eyebrows and for numerals. Prefer a hairline `border border-border-default` over any shadow.

## Where the truth lives

- **`styles.css`** (and the `_ds_bundle.css` it imports) — every token value and component style. Read it before styling.
- Each component's **`.d.ts`** (its exact props) and **`.prompt.md`** (usage) under `components/<group>/<Name>/`.
- **`guidelines/`** — the Plano brand guide (voice, iconography, layout, the full rules above).

## Idiomatic example

```tsx
import { Card, CardHeader, CardDescription, CardTitle, CardContent, CardFooter, Button, Badge } from '<pkg>';

<Card className="border border-border-default rounded-sm bg-surface-card">
  <CardHeader>
    <CardDescription>Helsinki · 1962</CardDescription>{/* mono eyebrow */}
    <CardTitle>Villa Saarinen</CardTitle>
    <Badge variant="success">Listed</Badge>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-text-secondary">
      A monolithic concrete residence set into the Finnish hillside.
    </p>
  </CardContent>
  <CardFooter className="gap-3">
    <Button>View building</Button>
    <Button variant="outline">Save</Button>
  </CardFooter>
</Card>
```
