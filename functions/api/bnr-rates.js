export async function onRequestGet() {
  const response = await fetch("https://www.bnr.ro/nbrfxrates.xml", {
    headers: {
      "Accept": "application/xml,text/xml"
    }
  });

  if (!response.ok) {
    return new Response("BNR feed unavailable", { status: 502 });
  }

  return new Response(await response.text(), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/xml; charset=utf-8"
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
