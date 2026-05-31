import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders/tracker — Query order status by Order Number (e.g. MM-1002) for visual tracker
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNo = searchParams.get("orderNo");

    if (!orderNo || orderNo.trim() === "") {
      return NextResponse.json({ error: "Missing order number parameter." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { orderNo: orderNo.trim().toUpperCase() },
      include: {
        customer: true,
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        statusHistory: {
          orderBy: { changedAt: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: `Order "${orderNo}" not found.` }, { status: 404 });
    }

    // Clean sensitive database internals, returning customer-safe tracking metrics
    const response = {
      orderNo: order.orderNo,
      status: order.status,
      deliveryType: order.deliveryType,
      createdAt: order.createdAt,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      total: Number(order.totalAmount),
      paymentStatus: order.paymentStatus,
      items: order.orderItems.map((item) => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        price: Number(item.price),
      })),
      history: order.statusHistory.map((h) => ({
        status: h.newStatus,
        changedAt: h.changedAt,
        note: h.note,
      })),
    };

    return NextResponse.json({ success: true, order: response }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Order tracker API failed:", error);
    return NextResponse.json({ error: "Failed to query order status." }, { status: 500 });
  }
}
