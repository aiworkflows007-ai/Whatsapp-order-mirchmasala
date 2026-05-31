import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { WhatsAppClient } from "@/lib/whatsapp/client";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/chat/messages — Retrieve complete message log transcript for a phone number
 */
export async function GET(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: "Missing customer phone parameter." }, { status: 400 });
    }

    const messages = await prisma.whatsAppMessageLog.findMany({
      where: {
        customerNumber: phone,
      },
      orderBy: {
        createdAt: "asc", // Chronological chat transcript
      },
    });

    return NextResponse.json({ success: true, messages }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Admin fetch chat messages failed:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch chat log." }, { status: 500 });
  }
}

/**
 * POST /api/admin/chat/messages — Send a manual outbound staff response and put chat in HANDOFF takeover mode
 */
export async function POST(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const { phone, message } = body;

    if (!phone || !message || message.trim() === "") {
      return NextResponse.json({ error: "Invalid reply parameters. Phone and message are required." }, { status: 400 });
    }

    // 1. Send outbound message via Meta WhatsApp Client
    console.log(`👤 [Staff Takeover Dispatch] Outbound to ${phone}: "${message}"`);
    const result = await WhatsAppClient.sendTextMessage(phone, message);

    if ("error" in result && result.error) {
      console.error("❌ Failed to deliver manual message on Meta:", result.error);
      return NextResponse.json({ error: "Failed to dispatch message to Meta Cloud API." }, { status: 500 });
    }

    // 2. Put customer conversation session in HANDOFF takeover mode to mute the AI
    await prisma.whatsAppConversation.update({
      where: { customerNumber: phone },
      data: {
        state: "HANDOFF",
      },
    });

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Admin send manual reply API failed:", error);
    return NextResponse.json({ error: error.message || "Failed to dispatch manual reply." }, { status: 500 });
  }
}
