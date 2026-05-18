import {
  cleanText,
  corsHeaders,
  fieldsToHtml,
  fieldsToText,
  handleOptions,
  insertRow,
  jsonResponse,
  normalizeFields,
  sendGmail,
  verifyTurnstile,
} from "../_shared/zen.ts";

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
    const fields = normalizeFields(payload.fields);
    const token = fields.turnstileToken;
    const text = fieldsToText(fields);
    const page = cleanText(payload.page, 500);
    const subject = "Cerere programare ZEN Clinics";
    const clinicEmail = Deno.env.get("CLINIC_EMAIL") || "office@zenclinics.ro";

    await verifyTurnstile(token, request);
    delete fields.turnstileToken;

    await insertRow("contact_requests", {
      request_type: cleanText(payload.type, 40) || "contact",
      page,
      fields,
      message: cleanText(payload.message || text, 5000),
      user_agent: cleanText(request.headers.get("user-agent"), 500),
    });

    await sendGmail({
      to: clinicEmail,
      subject,
      replyTo: fields.email,
      text: `${text}\n\nPagina: ${page}`,
      html: `<h1>${subject}</h1>${fieldsToHtml(fields)}<p><strong>Pagina:</strong> ${page}</p>`,
    });

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Request rejected" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
