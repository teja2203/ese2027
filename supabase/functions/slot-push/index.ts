// ESE2027 — slot-push Edge Function
// Sends Web Push notifications for the study-slot schedule.
// Triggered by pg_cron at each slot time (UTC), or manually with ?test=1.
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails("mailto:ponnada.tejavardhan@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE);

// Study slots in IST (minutes from midnight)
const SLOTS = [
  { at: 8 * 60 + 30,  icon: "📖", label: "Slot 1 · 8:30–10:30",  desc: "New / Hard Topics" },
  { at: 11 * 60,      icon: "✏️", label: "Slot 2 · 11:00–1:00",  desc: "Problem Solving" },
  { at: 15 * 60,      icon: "📚", label: "Slot 3 · 3:00–6:00",   desc: "Lecture Revision" },
  { at: 18 * 60 + 30, icon: "✍️", label: "Slot 4 · 6:30–8:30",   desc: "PYQ + Statement Qs" },
  { at: 21 * 60 + 30, icon: "📝", label: "Slot 5 · 9:30–10:30",  desc: "Formula Revision" },
];

function currentSlot() {
  const now = new Date();
  const istMins = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440; // UTC+5:30
  return SLOTS.find((s) => Math.abs(istMins - s.at) <= 15) || null;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.headers.get("x-cron-secret") !== CRON_SECRET && url.searchParams.get("secret") !== CRON_SECRET)
    return new Response("forbidden", { status: 403 });

  const isTest = url.searchParams.get("test") === "1";
  const slot = currentSlot();
  if (!slot && !isTest) return new Response("no slot at this time", { status: 200 });

  const payload = JSON.stringify(
    isTest
      ? { title: "🔔 Push works!", body: "Closed-app notifications are live. See you at the next slot.", tag: "ese-test" }
      : { title: `${slot!.icon} ${slot!.label}`, body: `${slot!.desc} — time to sit down. Open your plan.`, tag: "ese-slot" }
  );

  // fetch all subscriptions
  const res = await fetch(`${SB_URL}/rest/v1/push_subs?select=endpoint,sub`, {
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
  });
  const rows: { endpoint: string; sub: unknown }[] = await res.json();

  let sent = 0, dead = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(row.sub as webpush.PushSubscription, payload);
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        dead++;
        await fetch(`${SB_URL}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(row.endpoint)}`, {
          method: "DELETE",
          headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
        });
      }
    }
  }
  return new Response(JSON.stringify({ sent, dead, slot: slot?.label ?? "test" }), {
    headers: { "content-type": "application/json" },
  });
});
