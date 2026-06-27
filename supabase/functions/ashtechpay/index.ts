import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Country = {
  code: string;
  name: string;
  currency: string;
  operators: string[];
};

const ASHTECHPAY_BASE_URL = "https://ashtechpay.top";
const COUNTRIES: Country[] = [
  { code: "BJ", name: "Benin", currency: "XOF", operators: ["Moov Money", "MTN Mobile Money"] },
  { code: "BF", name: "Burkina Faso", currency: "XOF", operators: ["Moov Money", "Orange Money (OTP)"] },
  { code: "CM", name: "Cameroon", currency: "XAF", operators: ["MTN Mobile Money", "Orange Money"] },
  { code: "CF", name: "Central African Rep.", currency: "XAF", operators: ["Orange Money (OTP)"] },
  { code: "CG", name: "Congo", currency: "XAF", operators: ["Airtel Money", "MTN Mobile Money"] },
  { code: "CI", name: "Cote d'Ivoire", currency: "XOF", operators: ["Moov Money", "MTN", "Orange Money (OTP)", "Wave"] },
  { code: "GA", name: "Gabon", currency: "XAF", operators: ["Airtel Money", "Moov Money"] },
  { code: "GN", name: "Guinea Conakry", currency: "GNF", operators: ["MTN Mobile Money", "Orange Money (OTP)"] },
  { code: "GQ", name: "Equatorial Guinea", currency: "XAF", operators: ["Orange Money (OTP)"] },
  { code: "GW", name: "Guinea-Bissau", currency: "XOF", operators: ["Orange Money (OTP)"] },
  { code: "ML", name: "Mali", currency: "XOF", operators: ["Moov Money", "Orange Money (OTP)"] },
  { code: "NE", name: "Niger", currency: "XOF", operators: ["Airtel Money"] },
  { code: "CD", name: "DR Congo", currency: "CDF", operators: ["Afrimoney", "Airtel", "Orange Money (OTP)", "Vodacom M-Pesa"] },
  { code: "SN", name: "Senegal", currency: "XOF", operators: ["Free Money", "Orange Money (OTP)", "Wave"] },
  { code: "TD", name: "Chad", currency: "XAF", operators: ["Airtel Money", "Moov Money"] },
  { code: "TG", name: "Togo", currency: "XOF", operators: ["Flooz (Moov)", "T-Money"] },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function supabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function ashtechFetch(path: string, init?: RequestInit) {
  const apiKey = Deno.env.get("ASHTECHPAY_API_KEY");
  if (!apiKey) {
    return json({ error: "missing_secret", message: "Set ASHTECHPAY_API_KEY as a Supabase Edge Function secret." }, 500);
  }
  const response = await fetch(`${ASHTECHPAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_error) {
    data = { raw: text };
  }
  return json(data, response.status);
}

async function recordPayment(payload: Record<string, unknown>, result: Record<string, unknown> | null) {
  const db = supabaseAdmin();
  if (!db) return;
  await db.from("admin_ashtechpay_transactions").insert({
    reference: payload.reference,
    buyer_email: payload.email,
    amount: payload.amount,
    currency: payload.currency,
    country_code: payload.country_code,
    operator: payload.operator,
    phone: payload.phone,
    status: result?.status || result?.error || "pending",
    transaction_id: result?.transaction_id || null,
    raw_response: result,
  });
}

async function createPaymentTicket(payload: Record<string, unknown>, result: Record<string, unknown> | null) {
  const db = supabaseAdmin();
  if (!db) return;
  const text = JSON.stringify(result || {}).toLowerCase();
  if (!text.includes("subscription") && !text.includes("signal")) return;
  await db.from("admin_support_tickets").insert({
    subject: "Subscription payment signal problem",
    requester_email: payload.email || "unknown",
    status: "open",
    priority: "high",
    source: "ashtechpay_edge_function",
    body: "Subscription payment signal problem detected during Ashtechpay collection. Contact admin.",
    raw_context: { payload, result },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const actionFromPath = url.pathname.split("/").filter(Boolean).pop();
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const action = body.action || url.searchParams.get("action") || actionFromPath || "countries";

  try {
    if (action === "countries") {
      const live = await ashtechFetch("/v1/countries", { method: "GET" });
      if (live.status < 500) return live;
      return json(COUNTRIES);
    }

    if (action === "local_countries") return json(COUNTRIES);

    if (action === "fees") return ashtechFetch("/v1/fees", { method: "GET" });

    if (action === "transaction") {
      const id = body.transaction_id || url.searchParams.get("transaction_id");
      if (!id) return json({ error: "missing_transaction_id" }, 400);
      return ashtechFetch(`/v1/transaction/${id}`, { method: "GET" });
    }

    if (action === "collect") {
      const required = ["amount", "currency", "phone", "operator", "country_code"];
      const missing = required.filter((key) => !body[key]);
      if (missing.length) return json({ error: "missing_fields", fields: missing }, 400);
      const response = await fetch(`${ASHTECHPAY_BASE_URL}/v1/collect`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("ASHTECHPAY_API_KEY") || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number(body.amount),
          currency: body.currency,
          phone: body.phone,
          operator: String(body.operator).replace(" (OTP)", ""),
          country_code: body.country_code,
          reference: body.reference,
          otp: body.otp,
          notify_url: body.notify_url,
        }),
      });
      const result = await response.json().catch(() => ({}));
      await recordPayment(body, result);
      await createPaymentTicket(body, result);
      return json(result, response.status);
    }

    if (action === "webhook") {
      const db = supabaseAdmin();
      if (db) {
        await db.from("admin_ashtechpay_webhooks").insert({ payload: body, received_at: new Date().toISOString() });
        if (body.transaction_id) {
          await db.from("admin_ashtechpay_transactions").update({ status: body.status, raw_webhook: body }).eq("transaction_id", body.transaction_id);
        }
      }
      return json({ ok: true });
    }

    return json({ error: "unknown_action", action }, 400);
  } catch (error) {
    return json({ error: "edge_function_error", message: error instanceof Error ? error.message : String(error) }, 500);
  }
});
