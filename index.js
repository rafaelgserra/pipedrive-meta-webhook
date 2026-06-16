const express = require("express");
const crypto = require("crypto");
const fetch = require("node-fetch");
const app = express();
app.use(express.json());
const PIXEL_ID = process.env.PIXEL_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PIPEDRIVE_TOKEN = process.env.PIPEDRIVE_TOKEN;
const STAGE_MAP = { "6": "Lead", "7": "Contact", "8": "ViewContent", "9": "Schedule", "10": "InitiateCheckout", "11": "Purchase" };
function hash(v) { return crypto.createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex"); }
app.post("/webhook", async (req, res) => {
  try {
    const deal = req.body.current || req.body.data;
    if (!deal) return res.sendStatus(200);
    const stageId = String(deal.stage_id);
    const eventName = STAGE_MAP[stageId];
    console.log("Stage ID:", stageId, "Evento:", eventName);
    if (!eventName) return res.sendStatus(200);
    const userData = {};
    const personId = deal.person_id;
    if (personId) {
      const personRes = await fetch("https://api.pipedrive.com/v1/persons/" + personId + "?api_token=" + PIPEDRIVE_TOKEN);
      const personData = await personRes.json();
      const person = personData.data;
      console.log("Pessoa:", JSON.stringify(person).slice(0, 200));
      if (person) {
        const email = person.email && person.email[0] && person.email[0].value;
        const phone = person.phone && person.phone[0] && person.phone[0].value;
        if (email) userData.em = [hash(email)];
        if (phone) userData.ph = [hash(phone.replace(/\D/g, ""))];
      }
    }
    const response = await fetch("https://graph.facebook.com/v19.0/" + PIXEL_ID + "/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [{ event_name: eventName, event_time: Math.floor(Date.now() / 1000), event_id: "pipedrive_" + deal.id + "_" + stageId + "_" + Date.now(), action_source: "crm", user_data: userData, custom_data: { currency: "BRL", value: deal.value || 0 } }], access_token: ACCESS_TOKEN })
    });
    const result = await response.json();
    console.log("Resposta Meta:", JSON.stringify(result));
    res.sendStatus(200);
  } catch(err) { console.error("Erro:", err.message); res.sendStatus(500); }
});
app.listen(process.env.PORT || 3000, () => console.log("Rodando"));
