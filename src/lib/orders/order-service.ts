import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { getStatusText, isValidStatusTransition, OrderStatus } from "./status-machine";
import { WhatsAppClient } from "@/lib/whatsapp/client";

export enum DeliveryType {
  DELIVERY = "DELIVERY",
  PICKUP = "PICKUP",
  DINE_IN = "DINE_IN",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
  MANUAL_REVIEW = "MANUAL_REVIEW",
}

export interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
  notes?: string;
}

export interface CreateOrderInput {
  whatsappNumber: string; // Customer identifier
  customerName?: string;
  deliveryType: DeliveryType;
  deliveryAddress?: string;
  tableNumber?: string;
  notes?: string;
  items: CreateOrderItemInput[];
  idempotencyKey?: string;
}

/**
 * Service class handling database-level business logic for orders.
 */
export class OrderService {
  /**
   * Generates a unique, readable order number without relying on total row counts.
   */
  private static generateOrderNumber(): string {
    const now = new Date();
    const datePart = [
      now.getFullYear().toString().slice(-2),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("");
    const entropy = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
    return `MM-${datePart}-${entropy}`;
  }

  private static async generateUniqueOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const orderNo = this.generateOrderNumber();
      const existing = await tx.order.findUnique({ where: { orderNo } });
      if (!existing) return orderNo;
    }
    throw new Error("Could not generate a unique order number. Please try again.");
  }

  /**
   * Securely places an order:
   * 1. Validates items exist and reads their true price from DB.
   * 2. Calculates Subtotal, Tax (5.00% GST), and Total securely.
   * 3. Resolves Customer by WhatsApp number (creates if new).
   * 4. Persists Order, OrderItems, and initial OrderStatusHistory in a single TRANSACTION.
   */
  static async createOrder(input: CreateOrderInput) {
    if (!input.items || input.items.length === 0) {
      throw new Error("Cannot place an order with empty items.");
    }

    // Protect against duplicate submits using idempotency key if provided
    if (input.idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: {
          customer: true,
          orderItems: { include: { menuItem: true } },
          statusHistory: true,
        },
      });
      if (existing) {
        console.log(`[Idempotency] Duplicate request caught for key: ${input.idempotencyKey}. Returning existing order.`);
        return existing;
      }
    }

    // Resolve restaurant metadata (we assume the first restaurant is Mirch Masala)
    const restaurant = await prisma.restaurant.findFirst();
    if (!restaurant) {
      throw new Error("No restaurant initialized. Please run seeds first.");
    }

    // Perform inside a single atomic database Transaction
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch menu items and map prices securely (do not trust user input prices!)
      const itemIds = input.items.map((i) => i.menuItemId);
      const dbItems = await tx.menuItem.findMany({
        where: { id: { in: itemIds }, isAvailable: true },
      });

      if (dbItems.length !== input.items.length) {
        throw new Error("One or more food items in your cart do not exist or are currently unavailable.");
      }

      // Create lookup dictionary for prices
      const priceLookup = new Map<string, number>();
      dbItems.forEach((item) => {
        priceLookup.set(item.id, Number(item.price));
      });

      // Calculate totals securely
      let subtotal = 0;
      const parsedItems = input.items.map((item) => {
        const truePrice = priceLookup.get(item.menuItemId);
        if (!truePrice) throw new Error("Invalid menu item price resolution");
        const itemCost = truePrice * item.quantity;
        subtotal += itemCost;

        return {
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: new Prisma.Decimal(truePrice),
          notes: item.notes,
        };
      });

      // 5% GST calculation
      const taxRatePercentage = Number(restaurant.taxRate) / 100;
      const tax = subtotal * taxRatePercentage;
      const total = subtotal + tax;

      // 2. Find or Create Customer
      let customer = await tx.customer.findUnique({
        where: { whatsappNumber: input.whatsappNumber },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            whatsappNumber: input.whatsappNumber,
            name: input.customerName || `Customer ${input.whatsappNumber.slice(-4)}`,
            address: input.deliveryAddress,
          },
        });
      } else if (input.customerName || input.deliveryAddress) {
        // Update profile if they provided fresh details
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            name: input.customerName || customer.name,
            address: input.deliveryAddress || customer.address,
          },
        });
      }

      // 3. Generate sequential Order Number
      const orderNo = await this.generateUniqueOrderNumber(tx);

      // 4. Create Order row
      const order = await tx.order.create({
        data: {
          orderNo,
          customerId: customer.id,
          restaurantId: restaurant.id,
          status: OrderStatus.NEW,
          deliveryType: input.deliveryType,
          deliveryAddress: input.deliveryType === DeliveryType.DELIVERY ? input.deliveryAddress : null,
          tableNumber: input.deliveryType === DeliveryType.DINE_IN ? input.tableNumber : null,
          notes: input.notes,
          subtotal: new Prisma.Decimal(subtotal),
          tax: new Prisma.Decimal(tax),
          totalAmount: new Prisma.Decimal(total),
          paymentStatus: PaymentStatus.PENDING,
          idempotencyKey: input.idempotencyKey,
        },
      });

      // 5. Create OrderItem junction rows
      await tx.orderItem.createMany({
        data: parsedItems.map((item) => ({
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes,
        })),
      });

      // 6. Log Initial Status History (Audit Trail)
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: OrderStatus.NEW,
          newStatus: OrderStatus.NEW,
          changedBy: "SYSTEM (WhatsApp Bot)",
          note: "Order successfully placed by customer. Awaiting review.",
        },
      });

      // 7. Ensure WhatsApp active conversation is initialized or updated
      await tx.whatsAppConversation.upsert({
        where: { customerNumber: input.whatsappNumber },
        update: {
          state: "ORDER_TRACKING",
          activeCart: null, // Clear cart once placed
        },
        create: {
          customerNumber: input.whatsappNumber,
          state: "ORDER_TRACKING",
          activeCart: null,
        },
      });

      return await tx.order.findUnique({
        where: { id: order.id },
        include: {
          customer: true,
          orderItems: {
            include: {
              menuItem: true,
            },
          },
          statusHistory: true,
        },
      });
    });
  }

  /**
   * Updates an order's status enforcing strict state machine rules and logging details.
   */
  static async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    changedBy: string,
    note?: string
  ) {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error(`Order with ID ${orderId} not found.`);
      }

      const currentStatus = order.status as OrderStatus;

      // Enforce status state machine transitions
      if (!isValidStatusTransition(currentStatus, newStatus)) {
        throw new Error(
          `Invalid state transition: Cannot change status from ${order.status} to ${newStatus}.`
        );
      }

      // Update Order Status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      });

      // Record Status History Audit Trail
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          previousStatus: order.status,
          newStatus: newStatus,
          changedBy: changedBy || "STAFF",
          note: note || `Status updated from ${order.status} to ${newStatus}.`,
        },
      });

      // Auto update payment if order is delivered and was cash on delivery
      if (newStatus === OrderStatus.DELIVERED && order.paymentStatus === PaymentStatus.PENDING) {
        await tx.order.update({
          where: { id: orderId },
          data: { paymentStatus: PaymentStatus.PAID },
        });
      }

      return updatedOrder;
    });

    await this.notifyCustomerStatusUpdate(orderId, newStatus);

    return updatedOrder;
  }

  private static async notifyCustomerStatusUpdate(orderId: string, newStatus: OrderStatus) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { customer: true },
      });

      if (!order?.customer?.whatsappNumber) return;

      const statusText = getStatusText(newStatus);
      let msg = "";

      switch (newStatus) {
        case OrderStatus.PREPARING:
          msg = `🔥 Order #${order.orderNo}\n${statusText.hinglish}. Chef Sanjay cooking start kar chuke hain.`;
          break;
        case OrderStatus.READY:
          msg = `✅ Order #${order.orderNo}\nKhana ready hai. ${order.deliveryType === DeliveryType.DELIVERY ? "Rider assign hote hi update milega." : "Pickup/serve ke liye ready."}`;
          break;
        case OrderStatus.OUT_FOR_DELIVERY:
          msg = `🛵 Order #${order.orderNo}\nRider khana lekar nikal chuka hai.`;
          break;
        case OrderStatus.DELIVERED:
          msg = `🎉 Order #${order.orderNo}\nDelivered/served ho gaya. Dhanyawad!`;
          break;
        case OrderStatus.REJECTED:
          msg = `❌ Order #${order.orderNo}\nSorry, restaurant ne order reject kar diya. Staff se help le sakte hain.`;
          break;
        case OrderStatus.CANCELLED:
          msg = `❌ Order #${order.orderNo}\nOrder cancel ho gaya.`;
          break;
        default:
          return;
      }

      await WhatsAppClient.sendTextMessage(order.customer.whatsappNumber, msg);
    } catch (err) {
      console.error("❌ Failed to notify customer about order status:", err);
    }
  }

  /**
   * Compiles and dispatches a high-fidelity itemized text invoice receipt to the customer's WhatsApp
   */
  static async sendMasalaInvoice(orderId: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          orderItems: {
            include: {
              menuItem: true,
            },
          },
        },
      });

      if (!order) {
        console.warn(`[Invoicing] Order not found for ID: ${orderId}. Receipt dispatch aborted.`);
        return;
      }

      let invoiceText = `🧾 *MIRCH MASALA INVOICE TICKET*\n`;
      invoiceText += `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n`;
      invoiceText += `Order Number: *#${order.orderNo}*\n`;
      invoiceText += `Date: *${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}*\n`;
      invoiceText += `Customer Name: *${order.customer?.name || "Customer"}*\n`;
      invoiceText += `Delivery Type: *${order.deliveryType}*\n`;
      invoiceText += `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n`;
      invoiceText += `*Dishes Ordered:*\n`;

      order.orderItems.forEach((item) => {
        const cost = Number(item.price) * item.quantity;
        invoiceText += `▪️ *${item.menuItem.name}* (x${item.quantity}) — ₹${cost.toFixed(0)}\n`;
      });

      invoiceText += `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n`;
      invoiceText += `*Subtotal*: ₹${Number(order.subtotal).toFixed(2)}\n`;
      invoiceText += `*GST Tax (5%)*: ₹${Number(order.tax).toFixed(2)}\n`;
      invoiceText += `*Grand Total*: *₹${Number(order.totalAmount).toFixed(2)}*\n`;
      invoiceText += `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n`;
      invoiceText += `Payment Status: *${order.paymentStatus}*\n`;
      
      if (order.deliveryAddress) {
        invoiceText += `Delivery Address: *${order.deliveryAddress}*\n`;
      }
      if (order.tableNumber) {
        invoiceText += `Sitting Table Number: *${order.tableNumber}*\n`;
      }
      invoiceText += `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n`;
      invoiceText += `Garma-garam fresh food prepare ho raha hai. Live status check karte rahein. Dhanyawad! 🙏🍲`;

      console.log(`📡 [Invoicing - OUTBOUND] Dispatching invoice for Order #${order.orderNo} to ${order.customer.whatsappNumber}`);
      await WhatsAppClient.sendTextMessage(order.customer.whatsappNumber, invoiceText);
    } catch (err) {
      console.error("❌ Failed to compile or dispatch Masala invoice ticket:", err);
    }
  }
}
