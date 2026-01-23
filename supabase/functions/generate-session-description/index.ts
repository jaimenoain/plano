Deno.serve(async (req) => {
  return new Response(
    JSON.stringify({ error: "Endpoint deprecated" }),
    {
      status: 410,
      headers: { "Content-Type": "application/json" }
    }
  )
})
