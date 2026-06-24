const PRICE_BLOB_PATH = process.env.PRICES_BLOB_PATH || "owner/prices.json";
const PRICE_BLOB_ACCESS = process.env.PRICES_BLOB_ACCESS || "private";
const MAX_PRICE_PAYLOAD_BYTES = 1024 * 1024;

function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
}

function sendJson(res, status, payload) {
  setJsonHeaders(res);
  res.status(status).send(JSON.stringify(payload));
}

function isNotFound(error) {
  return error && (
    error.name === "BlobNotFoundError" ||
    error.code === "BLOB_NOT_FOUND" ||
    /not found/i.test(String(error.message || ""))
  );
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function assertValidPrices(prices) {
  const serialized = JSON.stringify(prices);

  if (!Array.isArray(prices)) {
    throw new Error("Invalid price payload");
  }

  if (Buffer.byteLength(serialized, "utf8") > MAX_PRICE_PAYLOAD_BYTES) {
    throw new Error("Price payload is too large");
  }

  prices.forEach((category) => {
    if (!category || typeof category !== "object" || !Array.isArray(category.items)) {
      throw new Error("Invalid price category");
    }

    category.items.forEach((entry) => {
      if (!Array.isArray(entry) || typeof entry[0] !== "string" || typeof entry[1] !== "string") {
        throw new Error("Invalid price item");
      }
    });
  });

  return serialized;
}

function getBearerToken(req) {
  const authorization = req.headers.authorization || "";

  if (/^Bearer\s+/i.test(authorization)) {
    return authorization.replace(/^Bearer\s+/i, "").trim();
  }

  return String(req.headers["x-owner-token"] || "").trim();
}

function assertOwnerToken(req) {
  const expected = process.env.OWNER_PRICE_TOKEN || process.env.PRICE_ADMIN_TOKEN;
  const received = getBearerToken(req);

  if (!expected) {
    const error = new Error("OWNER_PRICE_TOKEN is not configured");
    error.statusCode = 503;
    throw error;
  }

  if (!received || received !== expected) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }
}

async function readPrices() {
  const { get } = await import("@vercel/blob");
  const result = await get(PRICE_BLOB_PATH, { access: PRICE_BLOB_ACCESS });

  if (!result || !result.stream) {
    return null;
  }

  const text = await new Response(result.stream).text();
  return {
    etag: result.blob && result.blob.etag,
    prices: JSON.parse(text)
  };
}

async function writePrices(prices) {
  const { put } = await import("@vercel/blob");
  const body = assertValidPrices(prices);

  return put(PRICE_BLOB_PATH, body, {
    access: PRICE_BLOB_ACCESS,
    allowOverwrite: true,
    addRandomSuffix: false,
    cacheControlMaxAge: 0,
    contentType: "application/json"
  });
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Owner-Token");
    res.status(204).end();
    return;
  }

  try {
    if (req.method === "GET") {
      try {
        const data = await readPrices();

        if (!data) {
          sendJson(res, 404, { ok: false, prices: null });
          return;
        }

        sendJson(res, 200, { ok: true, source: "blob", path: PRICE_BLOB_PATH, ...data });
      } catch (error) {
        if (isNotFound(error)) {
          sendJson(res, 404, { ok: false, prices: null });
          return;
        }

        throw error;
      }

      return;
    }

    if (req.method === "POST" || req.method === "PUT") {
      assertOwnerToken(req);

      const payload = await readJsonBody(req);
      const prices = payload.prices || payload.categories || payload;
      const blob = await writePrices(prices);

      sendJson(res, 200, {
        ok: true,
        source: "blob",
        path: PRICE_BLOB_PATH,
        etag: blob.etag,
        url: blob.url
      });
      return;
    }

    res.setHeader("Allow", "GET, POST, PUT, OPTIONS");
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
  } catch (error) {
    const status = error.statusCode || 400;
    sendJson(res, status, { ok: false, error: error.message || "Request failed" });
  }
};
