import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

  if (!keyId || !keySecret) {
    return jsonResponse({ error: "Razorpay credentials not configured" }, 500);
  }

  try {
    const { action, event_id, event_title, amount_paise, ticket_count, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    // ───── CREATE ORDER ─────
    if (action === "create_order") {
      if (!amount_paise || amount_paise <= 0) {
        return jsonResponse({ error: "Invalid amount" }, 400);
      }

      const receipt = `evt_${(event_id || "x").toString().slice(0, 8)}_${Date.now()}`.slice(0, 40);

      const authHeader = "Basic " + btoa(`${keyId}:${keySecret}`);
      const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount_paise,
          currency: "INR",
          receipt,
          notes: {
            event_id: String(event_id || ""),
            ticket_count: String(ticket_count || 1),
          },
        }),
      });

      if (!orderRes.ok) {
        const errBody = await orderRes.text();
        console.error("Razorpay order creation failed:", errBody);
        return jsonResponse({ error: "Failed to create payment order" }, 502);
      }

      const order = await orderRes.json();

      return jsonResponse({
        key_id: keyId,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        event_id,
        event_title: event_title || "",
        ticket_count: ticket_count || 1,
      });
    }

    // ───── VERIFY PAYMENT ─────
    if (action === "verify_payment") {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return jsonResponse({ error: "Missing payment verification fields" }, 400);
      }

      const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
      const hmac = createHmac("sha256", keySecret);
      hmac.update(payload);
      const digest = hmac.digest("hex");

      const valid = digest === razorpay_signature;

      return jsonResponse({ valid });
    }

    return jsonResponse({ error: "Unknown action. Use 'create_order' or 'verify_payment'" }, 400);
  } catch (err) {
    console.error("event-payment error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
