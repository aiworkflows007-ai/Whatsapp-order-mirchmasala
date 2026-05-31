import { NextResponse } from "next/server";
import { z } from "zod";
import { OrderService } from "@/lib/orders/order-service";
import prisma from "@/lib/prisma";
import { WhatsAppTemplates } from "@/lib/whatsapp/templates";
import { requireAdmin } from "@/lib/auth";
import { OrderStatus } from "@/lib/orders/status-machine";

export const dynamic = "force-dynamic";

// Zod validation schema for updating status
const updateStatusSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
  newStatus: z.nativeEnum(OrderStatus),
  changedBy: z.string().min(2, "Name/username of the person must be provided").optional(),
  note: z.string().optional(),
});

/**
 * PATCH /api/admin/orders — Updates order status through state machine transitions.
 * Enforces rigid state updates, records details in OrderStatusHistory, and handles payments.
 */
export async function PATCH(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    
    // Validate schema
    const validation = updateStatusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { orderId, newStatus, note } = validation.data;

    // Call service transaction
    const updatedOrder = await OrderService.updateOrderStatus(
      orderId,
      newStatus,
      auth.session.name,
      note
    );

    // If manager accepted the order (Status: ACCEPTED), transition state and send payment options
    if (newStatus === "ACCEPTED") {
      // 1. Dispatch the beautiful itemized Masala Invoice ticket
      await OrderService.sendMasalaInvoice(orderId);

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { customer: true },
      });

      if (order && order.paymentStatus === "PENDING") {
        // Transition customer conversation state to AWAITING_PAYMENT in DB
        await prisma.whatsAppConversation.update({
          where: { customerNumber: order.customer.whatsappNumber },
          data: { state: "AWAITING_PAYMENT" },
        });

        // Format and send interactive WhatsApp quick reply payment buttons
        const summaryText = `Order #${order.orderNo} approved ✅\nTotal ₹${Number(order.totalAmount).toFixed(2)}. Payment option choose karein.`;
        await WhatsAppTemplates.sendPaymentOptions(order.customer.whatsappNumber, summaryText);
      }
    }

    return NextResponse.json({ success: true, order: updatedOrder }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Admin update order status API failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update order status." },
      { status: 400 } // Bad request since state transitions or queries are illegal
    );
  }
}

/**
 * GET /api/admin/orders — Fetch ALL orders for staff Kanban/Kitchen displays.
 * Groups details including customer profiles, items, and full history trail.
 */
export async function GET(req: Request) {
  try {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;

    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        payments: true,
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        statusHistory: {
          orderBy: { changedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" }, // Fresh orders first
    });

    return NextResponse.json({ success: true, orders }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Admin fetch all orders API failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard orders." },
      { status: 500 }
    );
  }
}
