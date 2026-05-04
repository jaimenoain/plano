import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }

    // Initialize Supabase client using the service role key for admin privileges
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let awardId: string | undefined;

    // Try to parse body, if any
    try {
      const body = await req.json();
      if (body?.award_id) {
        awardId = body.award_id;
      }
    } catch (e) {
      // It's okay if body parsing fails (e.g., no body sent)
    }

    // Fetch awards to sync
    let query = supabaseAdmin
      .from('awards')
      .select('id, wikidata_qid')
      .not('wikidata_qid', 'is', null);

    if (awardId) {
      query = query.eq('id', awardId);
    } else {
      // Sync those never fetched or fetched > 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query.or(`wikidata_fetched_at.is.null,wikidata_fetched_at.lt.${sevenDaysAgo.toISOString()}`);
    }

    const { data: awards, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    if (!awards || awards.length === 0) {
      return new Response(
        JSON.stringify({ synced: 0, errors: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Wikidata API limits ~50 items per request
    const batchSize = 50;
    let synced = 0;
    const errors: string[] = [];

    for (let i = 0; i < awards.length; i += batchSize) {
      const batch = awards.slice(i, i + batchSize);
      const qids = batch.map((a) => a.wikidata_qid).filter(Boolean);

      if (qids.length === 0) continue;

      const qidsParam = qids.join('|');
      const wikidataUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qidsParam}&props=sitelinks&format=json&origin=*`;

      try {
        const response = await fetch(wikidataUrl, {
          headers: {
            'User-Agent': 'PlanoApp/1.0 (https://plano.app; contact@plano.app)',
          },
        });

        if (!response.ok) {
          throw new Error(`Wikidata API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Process entities and update DB
        for (const award of batch) {
          const qid = award.wikidata_qid;
          if (!qid) continue;

          const entity = data.entities?.[qid];
          let sitelinksCount = 0;

          if (!entity || 'missing' in entity) {
            console.warn(`Wikidata QID ${qid} for award ${award.id} does not exist.`);
            // Will set to 0
          } else {
            sitelinksCount = Object.keys(entity.sitelinks || {}).length;
          }

          const { error: updateError } = await supabaseAdmin
            .from('awards')
            .update({
              wikidata_sitelinks: sitelinksCount,
              wikidata_fetched_at: new Date().toISOString(),
            })
            .eq('id', award.id);

          if (updateError) {
            console.error(`Error updating award ${award.id}:`, updateError);
            errors.push(`Failed to update award ${award.id}: ${updateError.message}`);
          } else {
            synced++;
          }
        }
      } catch (err: any) {
        console.error('Error fetching from Wikidata:', err);
        errors.push(`Wikidata batch fetch failed: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({ synced, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
