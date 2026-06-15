const express = require("express");
const crypto = require("crypto");
const fetch = require("node-fetch");
const app = express();
app.use(express.json());
const PIXEL_ID = process.env.PIXEL_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const STAGE_MAP = { "6": "Lead", "7": "Contact", "8": "ViewContent", "9": "Schedule" };
function hash(v) { return crypto.createHash("sha256").update(v.trim().toLowerCase()).digest("hex"); }
app.post("/webhook", async (req, res) => {
  try {
    const deal = req.body && req.body.current;
    if (!deal) return res.sendStatus(200);
    const stageId = String(deal.stage_id);
    const eventName = STAGE_MAP[stageId];
    if (!eventName) return res.sendStatus(200);
    const email = deal.person_id && deal.person_id.email && deal.person_id.email[0] && deal.person_id.email[0].value;
    const phone = deal.person_id && deal.person_id.phone && deal.person_id.phone[0] && deal.person_id.phone[0].value;
    const userData = {};
    if (email) userData.em = [hash(email)];
    if (phone) userData.ph = [hash(phone)];
    await fetch("https://graph.facebook.com/v19.0/" + PIXEL_ID + "/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [{ event_name: eventName, event_time: Math.floor(Date.now() / 1000), event_id: "pipedrive_" + deal.id + "_" + stageId, action_source: "crm", user_data: userData, custom_data: { currency: "BRL", value: deal.value || 0 } }], access_token: ACCESS_TOKEN })
    });
    console.log("Evento enviado:", eventName);
    res.sendStatus(200);
  } catch(err) { console.error("Erro:", err.message); res.sendStatus(500); }
});
app.listen(process.env.PORT || 3000, () => console.log("Rodando"));
