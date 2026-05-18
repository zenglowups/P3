import { cleanText, corsHeaders, handleOptions, jsonResponse, verifyTurnstile } from "../_shared/zen.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) {
    return options;
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = await request.json();
    const query = cleanText(payload.query, 80);

    if (payload.turnstileToken) {
      await verifyTurnstile(cleanText(payload.turnstileToken, 2048), request);
    }

    if (query.length > 80 || /[<>{}[\]$]/.test(query)) {
      return jsonResponse({ error: "Invalid query" }, 400);
    }

    return jsonResponse({ ok: true, query });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Request rejected" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
