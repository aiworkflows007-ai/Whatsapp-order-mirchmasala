import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/chat/conversations — Fetch active customer chats for visual inbox
 */
export async function GET(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;

    const conversations = await prisma.whatsAppConversation.findMany({
      include: {
        customer: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const formatted = conversations.map((conv) => {
      // Parse active cart item counts
      let itemCount = 0;
      if (conv.activeCart) {
        try {
          const parsed = JSON.parse(conv.activeCart);
          itemCount = Object.keys(parsed).filter(k => k !== "isBooking").length;
        } catch (e) {}
      }

      return {
        id: conv.id,
        phone: conv.customerNumber,
        customerName: conv.customer?.name || `Customer ${conv.customerNumber.slice(-4)}`,
        state: conv.state,
        itemCount,
        updatedAt: conv.updatedAt,
      };
    });

    return NextResponse.json({ success: true, conversations: formatted }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Admin fetch conversations API failed:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch active chats." }, { status: 500 });
  }
}
