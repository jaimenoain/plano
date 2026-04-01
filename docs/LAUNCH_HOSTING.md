# Launch hosting notes (Track B)

## Edge functions: `og-tags` and `sitemap`

Both functions are configured with **`verify_jwt = false`** in [`supabase/config.toml`](../supabase/config.toml) so your CDN or worker can invoke them without a user session. They only use the **anon** Supabase client and public data.

Optional: set **`STORAGE_PUBLIC_URL`** in the Edge Function secrets if the default public asset base differs from `https://s3.eu-west-2.amazonaws.com/plano.app` (used to absolutize relative `hero_image_url` / `avatar_url` values in `og-tags`).

## Social / link-preview routing (`og-tags`)

Route **link-expanding and social preview** user agents to:

`https://<project-ref>.supabase.co/functions/v1/og-tags?path=<url-encoded-path>`

Example: `?path=%2Fbuilding%2F123%2Fslug-here`

### User agents

Use this list for **OG / preview only**. The main SSR app already returns full HTML (including meta tags and JSON-LD) to Googlebot, so this function is now primarily for social preview bots (Slack, Discord, etc.).

Suggested matchers (tune for your platform):

- `facebookexternalhit`, `Facebot`, `Twitterbot`, `LinkedInBot`, `Slackbot-LinkExpanding`
- `WhatsApp`, `TeleBot`, `TelegramBot`, `Discordbot`, `Pinterest`, `Embedly`
- `Quora Link Preview`, `Showyoubot`, `outbrain`, `vkShare`, `W3C_Validator`, `redditbot`, `Applebot`

## Sitemap routing (`sitemap`)

Proxy **`GET /sitemap.xml`** to:

`https://<project-ref>.supabase.co/functions/v1/sitemap`

## `robots.txt`

[`public/robots.txt`](../public/robots.txt) references `https://plano.app/sitemap.xml` — ensure production serves the sitemap URL above at that path.
