import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { WhatsAppClient } from "@/lib/whatsapp/client";
import { WhatsAppTemplates } from "@/lib/whatsapp/templates";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/chat/release — Releases staff takeover and hands conversation control back to Chef Sanjay AI
 */
export async function POST(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json({ error: "Missing customer phone parameter." }, { status: 400 });
    }

    // 1. Reset conversation state back to MAIN_MENU in the database
    await prisma.whatsAppConversation.update({
      where: { customerNumber: phone },
      data: {
        state: "MAIN_MENU",
        activeCart: null, // Clear cart context for fresh ordering
      },
    });

    // 2. Dispatch a friendly automated handoff release greeting
    const releaseText = "Aapka live support session resolve ho gaya hai. Chef Sanjay wapas online hai. 👨‍🍳🍲\n\nFood order karne ke liye niche check karein ya direct type karein!";
    await WhatsAppClient.sendTextMessage(phone, releaseText);

    // 3. Send standard Welcome Menu button controls
    await WhatsAppTemplates.sendWelcomeMenu(phone);

    return NextResponse.json({ success: true, status: "released" }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Admin release handoff API failed:", error);
    return NextResponse.json({ error: error.message || "Failed to release chat control." }, { status: 500 });
  }
}
