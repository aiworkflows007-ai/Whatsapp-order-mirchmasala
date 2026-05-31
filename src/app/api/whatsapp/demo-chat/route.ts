import { NextResponse } from "next/server";
import { WhatsAppParser } from "@/lib/whatsapp/parser";
import { WhatsAppConversationEngine } from "@/lib/whatsapp/conversation-engine";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/whatsapp/demo-chat
 * Connects the frontend Web Simulator directly to the stateful Conversation Engine
 */
export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Demo chat is disabled in production." }, { status: 404 });
    }

    const body = await req.json();

    // Set simulator default phone number if not provided
    const payload = {
      from: body.from || "919876543210",
      type: body.type || "text",
      content: body.content || body.message || "",
      actionPayload: body.actionPayload || undefined,
      profileName: body.profileName || "Ashok Kumar",
    };

    // Normalize simulator request
    const incoming = WhatsAppParser.parseSimulator(payload);
    if (!incoming) {
      return NextResponse.json({ error: "Invalid simulator request details." }, { status: 400 });
    }

    // Run message through stateful engine
    const reply = await WhatsAppConversationEngine.processMessage(incoming);

    // Retrieve the active state to return to simulator
    const session = await prisma.whatsAppConversation.findUnique({
      where: { customerNumber: payload.from },
    });

    return NextResponse.json({
      success: true,
      replyText: reply.replyText,
      replyType: reply.replyType,
      payload: reply.payload,
      nextState: session?.state || "START",
    });
  } catch (error: any) {
    console.error("❌ Demo-chat simulator API failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
