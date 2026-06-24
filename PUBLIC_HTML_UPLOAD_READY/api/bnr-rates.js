module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    const response = await fetch("https://www.bnr.ro/nbrfxrates.xml", {
      headers: {
        Accept: "application/xml,text/xml"
      }
    });

    if (!response.ok) {
      res.status(502).send("BNR feed unavailable");
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    res.status(200).send(await response.text());
  } catch (error) {
    res.status(502).send("BNR feed unavailable");
  }
};
