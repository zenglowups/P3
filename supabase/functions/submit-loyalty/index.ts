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
      const clientName = fields.full_name || fields.name;
      const clientGreeting = clientName ? `, ${escapeHtml(clientName)}` : "";
      const clientText = [
        "Buna,",
        "",
        "Iti multumim pentru solicitarea ZEN VIP Card.",
        "",
        "Cardul de loialitate se primeste fizic in clinica, dupa minimum o consultatie sau o procedura efectuata la ZEN Clinics.",
        "",
        "Cu ZEN VIP Card poti beneficia de avantaje dedicate, inclusiv discount extra peste preturile deja reduse, in functie de istoricul tau de consultatii/proceduri si de recomandarile medicale aplicabile.",
        "",
        "Echipa ZEN Clinics te va contacta pentru confirmarea detaliilor.",
        "",
        "ZEN Clinics"
      ].join("\n");

      await sendGmail({
        to: clientEmail,
        subject: "Am primit solicitarea ta pentru ZEN VIP Card",
        text: clientText,
        html: `<p>Bună${clientGreeting},</p><p>Îți mulțumim pentru solicitarea <strong>ZEN VIP Card</strong>.</p><p>Cardul de loialitate se primește fizic în clinică, după minimum o consultație sau o procedură efectuată la ZEN Clinics.</p><p>Cu ZEN VIP Card poți beneficia de avantaje dedicate, inclusiv discount extra peste prețurile deja reduse, în funcție de istoricul tău de consultații/proceduri și de recomandările medicale aplicabile.</p><p>Echipa ZEN Clinics te va contacta pentru confirmarea detaliilor.</p><p>ZEN Clinics</p>`,
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
