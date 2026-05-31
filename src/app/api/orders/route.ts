import { NextResponse } from "next/server";
import { z } from "zod";
import { DeliveryType, OrderService } from "@/lib/orders/order-service";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Zod validation schema for ordering payload
const orderSchema = z.object({
  whatsappNumber: z.string().min(10, "Phone number must be at least 10 digits").max(15),
  customerName: z.string().optional(),
  deliveryType: z.nativeEnum(DeliveryType),
  deliveryAddress: z.string().nullable().optional(),
  tableNumber: z.string().nullable().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      menuItemId: z.string().uuid("Invalid food item ID format"),
      quantity: z.number().int().positive("Quantity must be at least 1"),
      notes: z.string().optional()
    })
  ).min(1, "Cart must contain at least 1 food item"),
  idempotencyKey: z.string().optional(),
});

/**
 * POST /api/orders — Secure order placement
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate request body
    const validation = orderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Call service to process order, tax, customer profiling and transaction DB logs
    const order = await OrderService.createOrder({
      ...validation.data,
      deliveryAddress: validation.data.deliveryAddress || undefined,
      tableNumber: validation.data.tableNumber || undefined,
    });

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error: any) {
    console.error("❌ Order placement API failed:", error);
    return NextResponse.json(
      { error: "Failed to process order. Please check your cart and try again." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders — Fetch active orders for customers or general lists.
 * Supports filtering by WhatsApp number: `/api/orders?phone=919876543210`
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    // Fetch order filter criteria
    const criteria: any = {};
    if (phone) {
      criteria.customer = { whatsappNumber: phone };
    }

    const orders = await prisma.order.findMany({
      where: criteria,
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, orders }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Fetch orders API failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders." },
      { status: 500 }
    );
  }
}
