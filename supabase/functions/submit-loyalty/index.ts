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
      "Iti multumim pentru solicitarea trimisa pentru ZEN VIP Card.",
      "",
      "Am inregistrat adresa ta de email si solicitarea pentru cardul de loialitate.",
      "",
      "IMPORTANT: ZEN VIP Card se acorda DOAR dupa o procedura efectuata la ZEN Clinics.",
      "Consultatia simpla NU activeaza cardul si NU garanteaza primirea lui.",
      "Completarea formularului NU inseamna emiterea automata a cardului.",
      "",
      "Pasii urmatori:",
      "1. Poti programa consultatia pentru evaluare, daca este necesara medical.",
      "2. Alege si efectueaza procedura recomandata in cadrul ZEN Clinics.",
      "3. Dupa efectuarea procedurii, echipa confirma eligibilitatea pentru ZEN VIP Card.",
      "4. Cardul fizic se poate ridica din clinica.",
      "",
      "Beneficiile ZEN VIP Card se aplica dupa activarea cardului si se confirma in functie de procedura aleasa, istoricul tau in clinica si recomandarile medicale aplicabile.",
      "",
      "ZEN Clinics",
    ].join("\n");

    await sendGmail({
      to: clientEmail,
      subject: "Confirmare ZEN VIP Card - doar dupa procedura efectuata",
      text: clientText,
      html: `<p>Buna${clientGreeting},</p><p>Iti multumim pentru solicitarea trimisa pentru <strong>ZEN VIP Card</strong>.</p><p>Am inregistrat adresa ta de email si solicitarea pentru cardul de loialitate.</p><div style="border:2px solid #b42318;background:#fff4f2;color:#4b0b08;padding:16px 18px;margin:18px 0;font-family:Arial,sans-serif;"><p style="margin:0 0 8px;font-size:16px;font-weight:800;text-transform:uppercase;">Important: ZEN VIP Card se acorda DOAR dupa o procedura efectuata la ZEN Clinics.</p><p style="margin:0;font-size:14px;line-height:1.55;">Consultatia simpla NU activeaza cardul si NU garanteaza primirea lui. Completarea formularului NU inseamna emiterea automata a cardului.</p></div><p><strong>Pasii urmatori:</strong></p><ol><li>Poti programa consultatia pentru evaluare, daca este necesara medical.</li><li>Alege si efectueaza procedura recomandata in cadrul ZEN Clinics.</li><li>Dupa efectuarea procedurii, echipa confirma eligibilitatea pentru ZEN VIP Card.</li><li>Cardul fizic se poate ridica din clinica.</li></ol><p>Beneficiile ZEN VIP Card se aplica dupa activarea cardului si se confirma in functie de procedura aleasa, istoricul tau in clinica si recomandarile medicale aplicabile.</p><p>ZEN Clinics</p>`,
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
