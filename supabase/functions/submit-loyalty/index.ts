import {
  cleanText,
  corsHeaders,
  escapeHtml,
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
    const text = fieldsToText(fields);

    await verifyTurnstile(token, request);
    delete fields.turnstileToken;

    if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      return jsonResponse({ error: "Client email is required" }, 400);
    }

    await insertRow("loyalty_requests", {
      page,
      email: clientEmail,
      fields,
      message: cleanText(payload.message || text, 5000),
      user_agent: cleanText(request.headers.get("user-agent"), 500),
    });

    const clientName = fields.full_name || fields.name;
    const clientGreeting = clientName ? `, ${escapeHtml(clientName)}` : "";
    const clientText = [
      "Buna,",
      "",
      "Iti multumim pentru inscrierea in programul ZEN VIP Card.",
      "",
      "Am inregistrat adresa ta de email si solicitarea pentru cardul de loialitate.",
      "",
      "Pentru a primi cardul fizic, este necesar sa efectuezi cel putin o consultatie, operatie sau procedura in cadrul ZEN Clinics. Cardul se confirma si se inmaneaza fizic in clinica, dupa validarea eligibilitatii.",
      "",
      "Pasii urmatori:",
      "1. Programeaza o consultatie sau procedura la ZEN Clinics.",
      "2. Mentioneaza in clinica faptul ca te-ai inscris pentru ZEN VIP Card.",
      "3. Dupa efectuarea consultatiei/procedurii, echipa confirma eligibilitatea.",
      "4. Cardul fizic se poate ridica din clinica.",
      "",
      "Prin ZEN VIP Card poti primi beneficii dedicate si extra discount fata de preturile deja reduse, in functie de procedura aleasa, istoricul tau in clinica si recomandarile medicale aplicabile.",
      "",
      "ZEN Clinics",
    ].join("\n");

    await sendGmail({
      to: clientEmail,
      subject: "Confirmare inscriere ZEN VIP Card",
      text: clientText,
      html: `<p>Buna${clientGreeting},</p><p>Iti multumim pentru inscrierea in programul <strong>ZEN VIP Card</strong>.</p><p>Am inregistrat adresa ta de email si solicitarea pentru cardul de loialitate.</p><p>Pentru a primi cardul fizic, este necesar sa efectuezi cel putin o consultatie, operatie sau procedura in cadrul ZEN Clinics. Cardul se confirma si se inmaneaza fizic in clinica, dupa validarea eligibilitatii.</p><p><strong>Pasii urmatori:</strong></p><ol><li>Programeaza o consultatie sau procedura la ZEN Clinics.</li><li>Mentioneaza in clinica faptul ca te-ai inscris pentru ZEN VIP Card.</li><li>Dupa efectuarea consultatiei/procedurii, echipa confirma eligibilitatea.</li><li>Cardul fizic se poate ridica din clinica.</li></ol><p>Prin ZEN VIP Card poti primi beneficii dedicate si <strong>extra discount fata de preturile deja reduse</strong>, in functie de procedura aleasa, istoricul tau in clinica si recomandarile medicale aplicabile.</p><p>ZEN Clinics</p>`,
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
