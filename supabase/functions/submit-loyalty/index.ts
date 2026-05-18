import {
  cleanText,
  corsHeaders,
  escapeHtml,
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
    const page = cleanText(payload.page, 500);
    const clientEmail = cleanText(fields.email, 320);
    const clinicEmail = Deno.env.get("CLINIC_EMAIL") || "office@zenclinics.ro";
    const subject = "Solicitare ZEN VIP Card";
    const text = fieldsToText(fields);

    await verifyTurnstile(token, request);
    delete fields.turnstileToken;

    await insertRow("loyalty_requests", {
      page,
      email: clientEmail,
      fields,
      message: cleanText(payload.message || text, 5000),
      user_agent: cleanText(request.headers.get("user-agent"), 500),
    });

    await sendGmail({
      to: clinicEmail,
      subject,
      replyTo: clientEmail,
      text: `${text}\n\nPagina: ${page}`,
      html: `<h1>${subject}</h1>${fieldsToHtml(fields)}<p><strong>Pagina:</strong> ${page}</p>`,
    });

    if (clientEmail) {
      await sendGmail({
        to: clientEmail,
        subject: "Am primit solicitarea ta pentru ZEN VIP Card",
        text: "Îți mulțumim pentru solicitare. Echipa ZEN Clinics te va contacta pentru confirmarea detaliilor.",
        html: `<p>Bună${fields.name ? `, ${escapeHtml(fields.name)}` : ""},</p><p>Îți mulțumim pentru solicitarea ZEN VIP Card. Echipa ZEN Clinics te va contacta pentru confirmarea detaliilor.</p><p>ZEN Clinics</p>`,
      });
    }

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Request rejected" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
