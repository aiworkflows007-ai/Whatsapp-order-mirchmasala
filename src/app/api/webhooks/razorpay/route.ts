import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { OrderStatus } from "@/lib/orders/status-machine";
import { WhatsAppClient } from "@/lib/whatsapp/client";
import { OrderService } from "@/lib/orders/order-service";
import { envValue } from "@/lib/env-values";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/razorpay — Secure Webhook endpoint for Razorpay payment captured alerts
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    console.log(`📱 [Razorpay Webhook] Received signature: ${signature}`);

    const webhookSecret = envValue("RAZORPAY_WEBHOOK_SECRET");
    if (!webhookSecret || webhookSecret.includes("placeholder")) {
      console.error("❌ [Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET is not configured.");
      return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
    }

    // Secure Verification Check
    // In local development only, we allow a special bypass signature for the sandbox page.
    let isValid = false;
    if (process.env.NODE_ENV !== "production" && signature === "sandbox_verification_signature") {
      isValid = true;
    } else if (signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");
      isValid = expectedSignature === signature;
    }

    if (!isValid) {
      console.warn("⚠️ [Razorpay Webhook] Invalid webhook signature detected.");
      return NextResponse.json({ error: "Invalid signature verification." }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log(`📱 [Razorpay Webhook] Event parsed: ${event}`);

    // Process CAPTURED event (success payment)
    if (event === "payment.captured") {
      const paymentEntity = payload.payload.payment.entity;
      const paymentLinkId = paymentEntity.payment_link_id;
      const razorpayPaymentId = paymentEntity.id;
      const amountPaid = Number(paymentEntity.amount) / 100; // paise to Rupees

      if (!paymentLinkId) {
        return NextResponse.json({ success: true, message: "Ignored. No payment link associated." });
      }

      // Locate corresponding PaymentAttempt in database
      const paymentAttempt = await prisma.paymentAttempt.findFirst({
        where: {
          transactionRef: paymentLinkId,
          status: "PENDING",
        },
        include: { order: { include: { customer: true } } },
      });

      if (!paymentAttempt) {
        console.warn(`⚠️ [Razorpay Webhook] PaymentAttempt not found or already verified for Link ID: ${paymentLinkId}`);
        return NextResponse.json({ error: "Payment attempt not found or already processed." }, { status: 404 });
      }

      const order = paymentAttempt.order;
      const nextStatus = order.status === OrderStatus.ACCEPTED ? OrderStatus.PREPARING : order.status;

      // Perform atomic database transaction to update states
      await prisma.$transaction(async (tx) => {
        // 1. Update Order parameters
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "PAID",
            status: nextStatus,
          },
        });

        // 2. Add Order Status History entry
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            previousStatus: order.status,
            newStatus: nextStatus,
            changedBy: "System (Razorpay Webhook)",
            note: `Online payment captured successfully via Razorpay (Payment ID: ${razorpayPaymentId}). Order moved to kitchen queue.`,
          },
        });

        // 3. Mark PaymentAttempt as completed and lock Payment ID
        await tx.paymentAttempt.update({
          where: { id: paymentAttempt.id },
          data: {
            status: "PAID",
            transactionRef: razorpayPaymentId,
          },
        });

        await tx.whatsAppConversation.update({
          where: { customerNumber: order.customer.whatsappNumber },
          data: { state: "ORDER_TRACKING" },
        }).catch(() => undefined);
      });

      console.log(`🟢 [Razorpay Webhook] Order #${order.orderNo} successfully marked as PAID and moved to ${nextStatus}!`);

      // 4. Dispatch the beautiful itemized Masala Invoice ticket
      await OrderService.sendMasalaInvoice(order.id);

      // 5. Dispatch real-time WhatsApp alert to customer
      const confirmMsg = `🟢 *Payment Confirmed!* (Ref: ${razorpayPaymentId})\n\nHumne aapka online payment ₹${amountPaid.toFixed(2)} received kar liya hai.\n\nAapka order **#${order.orderNo}** prepare hona shuru ho gaya hai! Chef Sanjay is on it! 👨‍🍳🔥`;
      await WhatsAppClient.sendTextMessage(order.customer.whatsappNumber, confirmMsg);

      return NextResponse.json({ success: true, orderId: order.id }, { status: 200 });
    }

    // Process FAILED event (payment failed)
    if (event === "payment.failed") {
      const paymentEntity = payload.payload.payment.entity;
      const paymentLinkId = paymentEntity.payment_link_id;

      if (paymentLinkId) {
        const paymentAttempt = await prisma.paymentAttempt.findFirst({
          where: { transactionRef: paymentLinkId, status: "PENDING" },
          include: { order: true },
        });

        if (paymentAttempt) {
          await prisma.$transaction(async (tx) => {
            await tx.paymentAttempt.update({
              where: { id: paymentAttempt.id },
              data: { status: "FAILED" },
            });
            await tx.orderStatusHistory.create({
              data: {
                orderId: paymentAttempt.orderId,
                previousStatus: paymentAttempt.order.status,
                newStatus: paymentAttempt.order.status,
                changedBy: "System (Razorpay Webhook)",
                note: `Online payment attempt failed via Razorpay.`,
              },
            });
          });
          console.log(`🔴 [Razorpay Webhook] Payment failed marked for Order #${paymentAttempt.order.orderNo}`);
        }
      }
      return NextResponse.json({ success: true, message: "Handled failed status." }, { status: 200 });
    }

    return NextResponse.json({ success: true, message: "Event type not processed." }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Razorpay webhook processing failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
