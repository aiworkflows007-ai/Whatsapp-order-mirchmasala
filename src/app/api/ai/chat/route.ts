import { NextResponse } from "next/server";
import { AIRestaurantAgent } from "@/lib/ai/restaurant-agent";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/chat — Local secure AI chat test route (bypasses WhatsApp API/Ngrok)
 */
export async function POST(req: Request) {
  try {
    const auth = requireAdmin(req, ["OWNER"]);
    if (auth.response) return auth.response;

    const body = await req.json();
    const phone = body.phone || "919999999999";
    const message = body.message || "";
    const profileName = body.profileName || "Test Customer";

    if (!message || message.trim() === "") {
      return NextResponse.json({ error: "Empty query message provided." }, { status: 400 });
    }

    const aiResult = await AIRestaurantAgent.handleRestaurantAIMessage({
      phone,
      profileName,
      message,
    });

    return NextResponse.json({
      success: true,
      reply: aiResult.reply,
      actions: aiResult.actions,
      session: aiResult.session,
      handoff: aiResult.handoff,
    }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Local AI Chat endpoint error:", error);
    return NextResponse.json({ error: error.message || "Failed to process chat agent." }, { status: 500 });
  }
}
