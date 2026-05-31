import { NextResponse } from "next/server";
import crypto from "crypto";
import { WhatsAppParser } from "@/lib/whatsapp/parser";
import { WhatsAppConversationEngine } from "@/lib/whatsapp/conversation-engine";
import { envValue } from "@/lib/env-values";

export const dynamic = "force-dynamic";

function verifyMetaSignature(rawBody: string, signature: string | null) {
  const appSecret = envValue("WHATSAPP_APP_SECRET");
  if (!appSecret || appSecret.includes("placeholder")) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("WHATSAPP_APP_SECRET must be configured in production.");
    }
    return true;
  }

  if (!signature || !signature.startsWith("sha256=")) return false;
  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

/**
   * GET /api/whatsapp/webhook — Meta Webhook Handshake Verification
   */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    const verifyToken = envValue("WHATSAPP_VERIFY_TOKEN") || "mirch_masala_verify_token_secure_99";

    if (mode && token) {
      if (mode === "subscribe" && token === verifyToken) {
        console.log("📡 [WhatsApp Webhook] Meta Verification Successful!");
        return new Response(challenge, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      } else {
        console.warn("⚠️ [WhatsApp Webhook] Meta Verification Failed! Tokens mismatch.");
        return new Response("Forbidden", { status: 403 });
      }
    }

    return new Response("Bad Request", { status: 400 });
  } catch (error: any) {
    console.error("❌ Meta webhook validation error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * POST /api/whatsapp/webhook — Handles inbound messages from Meta Cloud API
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    if (!verifyMetaSignature(rawBody, signature)) {
      console.warn("⚠️ [WhatsApp Webhook] Invalid Meta webhook signature.");
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // Log the incoming Meta webhook event payload for server audit
    if (process.env.NODE_ENV !== "production") {
      console.log("📡 [WhatsApp Webhook - INBOUND METADATA]:", JSON.stringify(body));
    } else {
      console.log("📡 [WhatsApp Webhook] Valid inbound event received.");
    }

    // Parse the payload into normalized IncomingMessage
    const incoming = WhatsAppParser.parseWebhook(body);
    if (!incoming) {
      // Return 200 to acknowledge receipt of non-message updates (e.g. read status receipts)
      return NextResponse.json({ success: true, status: "ignored" });
    }

    // Run normalized message through conversational state machine engine
    const reply = await WhatsAppConversationEngine.processMessage(incoming);

    return NextResponse.json({ success: true, reply }, { status: 200 });
  } catch (error: any) {
    console.error("❌ WhatsApp webhook processing failed:", error);
    if (process.env.NODE_ENV === "production" && error.message?.includes("WHATSAPP_APP_SECRET")) {
      return NextResponse.json({ success: false, error: "Webhook is not configured." }, { status: 500 });
    }
    // Always return 200 to Meta to avoid webhook retries and lockouts
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process webhook." },
      { status: 200 }
    );
  }
}
