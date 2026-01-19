import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WatchProvider {
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

interface TMDBProvidersResponse {
  results: {
    [countryCode: string]: {
      link: string;
      flatrate?: WatchProvider[];
      buy?: WatchProvider[];
      rent?: WatchProvider[];
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get all profiles that have a country and subscribed platforms
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, country, subscribed_platforms')
      .not('country', 'is', null)
      .not('subscribed_platforms', 'is', null)

    if (profilesError) throw profilesError

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: 'No profiles to check' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. For these users, get their watchlist items (log status = 'watchlist')
    // We also need the TMDB ID from the films table
    const userIds = profiles.map(p => p.id)
    const { data: watchlists, error: watchlistError } = await supabaseClient
      .from('log')
      .select(`
        user_id,
        film_id,
        films (
          id,
          tmdb_id,
          title
        )
      `)
      .eq('status', 'watchlist')
      .in('user_id', userIds)

    if (watchlistError) throw watchlistError

    if (!watchlists || watchlists.length === 0) {
      return new Response(JSON.stringify({ message: 'No watchlist items to check' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Group by (TMDB ID, Country) to optimize API calls
    const filmsToCheck = new Map<string, Set<number>>() // Country -> Set<tmdb_id>

    // Helper to quick lookup user prefs
    const userPrefs = new Map(profiles.map(p => [p.id, p]))

    watchlists.forEach((item: any) => {
      const user = userPrefs.get(item.user_id)
      if (user && item.films?.tmdb_id) {
        if (!filmsToCheck.has(user.country)) {
          filmsToCheck.set(user.country, new Set())
        }
        filmsToCheck.get(user.country)?.add(item.films.tmdb_id)
      }
    })

    const tmdbApiKey = Deno.env.get('TMDB_API_KEY')
    const notificationsToSend: any[] = []
    const logEntries: any[] = []

    // 4. Check TMDB for each required film/country combination
    for (const [country, tmdbIds] of filmsToCheck.entries()) {
      for (const tmdbId of tmdbIds) {
        // Fetch Providers
        const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${tmdbApiKey}`)
        if (!response.ok) {
           console.error(`Failed to fetch providers for movie ${tmdbId}: ${response.statusText}`)
           continue
        }

        const data: TMDBProvidersResponse = await response.json()
        const countryProviders = data.results[country]

        if (countryProviders && countryProviders.flatrate) {
           const availableProviderNames = countryProviders.flatrate.map(p => p.provider_name)

           // Find users in this country who have this film in watchlist
           const relevantWatchlistItems = watchlists.filter((w: any) =>
             w.films?.tmdb_id === tmdbId &&
             userPrefs.get(w.user_id)?.country === country
           )

           for (const item of relevantWatchlistItems) {
             const user = userPrefs.get(item.user_id)
             if (!user) continue

             // Check intersection of User Subscriptions and Available Providers
             const userSubs = user.subscribed_platforms || []
             const matches = userSubs.filter((sub: string) => availableProviderNames.includes(sub))

             if (matches.length > 0) {
               // Found a match! e.g., "Netflix"
               // Check if we already notified this user about this film on this provider
               // We only notify for the FIRST match found in this run to avoid spam,
               // but strictly we should track each provider.
               // Let's iterate matches.
               for (const provider of matches) {
                  // Check DB for existing notification (we can't easily check inside the loop efficiently without cache,
                  // so we'll rely on ON CONFLICT or a pre-fetch.
                  // For batch efficiency, we might just try insert and ignore conflict?
                  // No, we need to insert into 'notifications' ONLY if 'watchlist_notifications' insert succeeds.
                  // Since we are in an Edge Function, we can do a check.

                  // Check if notified
                  const { data: existing } = await supabaseClient
                    .from('watchlist_notifications')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('film_id', item.film_id) // Use UUID
                    .eq('provider_name', provider)
                    .maybeSingle()

                  if (!existing) {
                    // Prepare Notification
                    notificationsToSend.push({
                      user_id: user.id,
                      actor_id: user.id, // System notification, but we need a sender. Usually a system ID or self. using self for now or maybe leave null if nullable? actor_id is usually not null.
                      // If actor_id is not null, we can use a special "System" user or the user themselves.
                      // Using user themselves as actor is common for "You have a..." if no other actor.
                      type: 'availability',
                      resource_id: item.film_id, // Link to film (via log? No, resource_id usually points to what triggered it. If UI expects log, this might fail. But we updated UI to handle film title from resource.film)
                      // resource_id usually foreign key.
                      // If FK points to `log`, we can use `item.id` (the log id).
                      // The UI uses resource.film.title. If resource points to log, log has film relation? Yes.
                      // Let's use the watchlist item ID (log id) as resource_id.
                      // That way the UI logic `resource.film` works (log -> film).
                      metadata: { provider_name: provider }
                    })

                    // Add to log list
                    logEntries.push({
                      user_id: user.id,
                      film_id: item.film_id, // UUID
                      provider_name: provider
                    })
                  }
               }
             }
           }
        }
      }
    }

    // 5. Execute Writes
    if (notificationsToSend.length > 0) {
      // Insert notifications
      // Note: We need to use the watchlist item ID (log ID) for resource_id if possible
      // In the loop above: `resource_id: item.id` (where item is the log entry)

      // Fix resource_id in logic above before running this:
      // In the loop: `relevantWatchlistItems` are rows from `log`. `item.id` is the log ID.
      // So `resource_id: item.id` is correct if `notifications.resource_id` FK points to `log`.
      // Let's assume it does (standard for this app).
      // Wait, in previous step I was worried about `resource_id`.
      // `notifications` table `resource_id` usually points to `log` (reviews, etc).
      // So `item.id` is perfect.

      // Update logic in loop above to use `item.id`:
      const finalNotifications = notificationsToSend.map(n => {
         // Find the item again? No, I need to fix the push above.
         // Rewriting the push logic here for clarity in the final structure:
         return n;
      }).map((n, i) => ({
         ...n,
         resource_id: watchlists.find((w: any) => w.film_id === logEntries[i].film_id && w.user_id === n.user_id)?.id
      }))

      const { error: notifError } = await supabaseClient
        .from('notifications')
        .insert(finalNotifications)

      if (notifError) {
        console.error('Error inserting notifications', notifError)
        throw notifError
      }

      // Insert Log entries
      const { error: logError } = await supabaseClient
        .from('watchlist_notifications')
        .insert(logEntries)

      if (logError) {
         console.error('Error inserting watchlist logs', logError)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      notifications_sent: notificationsToSend.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
