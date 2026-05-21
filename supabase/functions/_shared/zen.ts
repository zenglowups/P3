export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

function getFromAddress() {
  return Deno.env.get("SMTP_FROM_EMAIL") ||
    Deno.env.get("GMAIL_FROM") ||
    Deno.env.get("GMAIL_USER") ||
    Deno.env.get("SMTP_USER") ||
    "office@zenclinics.ro";
}

function getFromName() {
  return Deno.env.get("SMTP_FROM_NAME") || "ZEN Clinics";
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export function handleOptions(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return null;
}

export function cleanText(value: unknown, maxLength = 2000) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeFields(fields: Record<string, unknown> | undefined) {
  const result: Record<string, string> = {};

  Object.entries(fields || {}).forEach(([key, value]) => {
    result[cleanText(key, 80)] = cleanText(value, 1800);
  });

  return result;
}

export function fieldsToText(fields: Record<string, string>) {
  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

export function fieldsToHtml(fields: Record<string, string>) {
  return `<dl>${Object.entries(fields)
    .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join("")}</dl>`;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function verifyTurnstile(token: string | undefined, request: Request) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");

  if (!secret) {
    throw new Error("TURNSTILE_SECRET_KEY is missing");
  }

  if (!token) {
    throw new Error("Turnstile token is missing");
  }

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);

  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for");
  if (ip) {
    formData.append("remoteip", ip);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error("Turnstile validation failed");
  }
}

export async function insertRow(table: string, row: Record<string, unknown>) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Supabase service credentials are missing");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: serviceRole,
      authorization: `Bearer ${serviceRole}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    throw new Error(`Supabase insert failed: ${response.status}`);
  }
}

async function getGmailAccessToken() {
  const clientId = Deno.env.get("GMAIL_CLIENT_ID");
  const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GMAIL_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail OAuth credentials are missing");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error("Gmail access token could not be refreshed");
  }

  return data.access_token as string;
}

function base64Url(value: string) {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sendSmtp(message: EmailMessage) {
  const host = Deno.env.get("SMTP_HOST");
  const port = Number(Deno.env.get("SMTP_PORT") || "587");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");
  const secureValue = (Deno.env.get("SMTP_SECURE") || "").toLowerCase();
  const secure = secureValue ? ["1", "true", "yes", "ssl"].includes(secureValue) : port === 465;

  if (!host || !user || !pass) {
    throw new Error("SMTP credentials are missing");
  }

  const nodemailer = await import("npm:nodemailer@6.9.16");
  const createTransport = nodemailer.default?.createTransport || nodemailer.createTransport;
  const transporter = createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from: `"${getFromName()}" <${getFromAddress()}>`,
    to: message.to,
    replyTo: message.replyTo,
    subject: message.subject,
    text: message.text,
    html: message.html || `<pre>${escapeHtml(message.text)}</pre>`,
  });
}

async function sendViaGmail(message: EmailMessage) {
  const user = Deno.env.get("GMAIL_USER") || "me";
  const from = getFromAddress();
  const accessToken = await getGmailAccessToken();
  const raw = [
    `From: ${getFromName()} <${from}>`,
    `To: ${message.to}`,
    message.replyTo ? `Reply-To: ${message.replyTo}` : "",
    `Subject: ${message.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    message.html || `<pre>${escapeHtml(message.text)}</pre>`,
  ].filter(Boolean).join("\r\n");

  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(user)}/messages/send`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ raw: base64Url(raw) }),
  });

  if (!response.ok) {
    throw new Error(`Gmail send failed: ${response.status}`);
  }
}

export async function sendGmail(message: EmailMessage) {
  if (Deno.env.get("SMTP_HOST")) {
    return sendSmtp(message);
  }

  return sendViaGmail(message);
}
