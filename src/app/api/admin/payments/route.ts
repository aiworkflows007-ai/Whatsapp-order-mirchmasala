import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { OrderStatus } from "@/lib/orders/status-machine";
import { requireAdmin } from "@/lib/auth";
import { WhatsAppClient } from "@/lib/whatsapp/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/payments — Approve or Reject manual UPI payments
 */
export async function POST(req: Request) {
  try {
    const auth = requireAdmin(req, ["OWNER"]);
    if (auth.response) return auth.response;

    const body = await req.json();
    const { orderId, action, note } = body;

    if (!orderId || !action) {
      return NextResponse.json({ error: "Missing required fields (Order ID, Action)." }, { status: 400 });
    }

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "Invalid action. Must be APPROVE or REJECT." }, { status: 400 });
    }

    // Atomic transaction to update both payment status and order status
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { customer: true },
      });

      if (!order) {
        throw new Error(`Order with ID ${orderId} not found.`);
      }

      const isApproved = action === "APPROVE";

      // 1. Update Order parameters
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: isApproved ? "PAID" : "FAILED",
          status: isApproved ? OrderStatus.PREPARING : order.status, // Auto-advance to preparing (kitchen queue) if payment is approved!
        },
        include: { customer: true },
      });

      // 2. Record Status History if approved (advances from ACCEPTED to PREPARING)
      if (isApproved) {
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            previousStatus: order.status,
            newStatus: OrderStatus.PREPARING,
            changedBy: auth.session.name,
            note: note || "UPI payment approved. Order moved to kitchen queue.",
          },
        });
      } else {
        // Record payment failure audit log
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            previousStatus: order.status,
            newStatus: order.status,
            changedBy: auth.session.name,
            note: note || "UPI payment verification failed or rejected.",
          },
        });
      }

      // 3. Update any associated PaymentAttempt records if any exist
      await tx.paymentAttempt.updateMany({
        where: { orderId, status: "PENDING" },
        data: { status: isApproved ? "PAID" : "FAILED" },
      });

      return updatedOrder;
    });

    const notifyText = action === "APPROVE"
      ? `🟢 Payment approved.\nOrder #${result.orderNo} kitchen me start ho gaya hai.`
      : `🔴 Payment verify nahi hua.\nOrder #${result.orderNo} ke liye staff se contact karein.`;
    if (result.customer?.whatsappNumber) {
      await WhatsAppClient.sendTextMessage(result.customer.whatsappNumber, notifyText);
    }

    console.log(`📱 [Admin Payment API] Manual payment action ${action} processed for Order: #${result.orderNo}`);
    return NextResponse.json({ success: true, order: result }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Admin payment approval failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
