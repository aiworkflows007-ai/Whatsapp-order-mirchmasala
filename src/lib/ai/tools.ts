import prisma from "@/lib/prisma";
import { OrderService, DeliveryType } from "@/lib/orders/order-service";

export interface BookingDetails {
  guestCount?: number;
  dateStr?: string;
  timeSlot?: string;
}

export class RestaurantTools {
  /**
   * Helper to resolve a Menu Item by ID or Name (case-insensitive fuzzy match)
   */
  static async resolveMenuItem(nameOrId: string) {
    if (!nameOrId) return null;

    // 1. Try direct ID match
    try {
      const item = await prisma.menuItem.findUnique({
        where: { id: nameOrId },
        include: { category: true },
      });
      if (item) return item;
    } catch (e) {}

    // 2. Load all available items and perform fuzzy name matching
    const allItems = await prisma.menuItem.findMany({
      where: { isAvailable: true },
      include: { category: true },
    });

    const searchStr = nameOrId.toLowerCase().trim();

    // Direct match (ignoring case/spaces)
    let matched = allItems.find(
      (item) => item.name.toLowerCase().trim() === searchStr
    );

    if (matched) return matched;

    // Contains match
    matched = allItems.find((item) =>
      item.name.toLowerCase().includes(searchStr)
    );

    if (matched) return matched;

    // Split words match (e.g. "paneer tikka" matches "Paneer Tikka Masala")
    const words = searchStr.split(/\s+/);
    matched = allItems.find((item) => {
      const itemNameLower = item.name.toLowerCase();
      return words.every((word) => itemNameLower.includes(word));
    });

    return matched || null;
  }

  /**
   * Retrieves the active restaurant menu
   */
  static async getMenu() {
    const categories = await prisma.category.findMany({
      orderBy: { position: "asc" },
      include: {
        menuItems: {
          where: { isAvailable: true },
          orderBy: { position: "asc" },
        },
      },
    });

    let context = "Mirch Masala Menu:\n";
    categories.forEach((cat) => {
      context += `\nCategory: ${cat.name}\n`;
      cat.menuItems.forEach((item) => {
        context += `- ${item.name}: ₹${Number(item.price).toFixed(0)} (${
          item.isVegetarian ? "Veg" : "Non-Veg"
        }). Description: ${item.description || "N/A"}\n`;
      });
    });

    return { categories, textContext: context };
  }

  /**
   * Adds an item to the customer's cart
   */
  static async addItemToCart(
    phone: string,
    itemResolvable: string,
    quantity: number = 1,
    notes?: string
  ) {
    const item = await this.resolveMenuItem(itemResolvable);
    if (!item) {
      return { success: false, error: `Food item "${itemResolvable}" not found in our menu.` };
    }

    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { customerNumber: phone },
    });

    if (!conversation) {
      return { success: false, error: "Session conversation not found." };
    }

    let cart: Record<string, number> = {};
    if (conversation.activeCart) {
      try {
        cart = JSON.parse(conversation.activeCart);
      } catch (e) {
        cart = {};
      }
    }

    const currentQty = cart[item.id] || 0;
    cart[item.id] = currentQty + quantity;

    await prisma.whatsAppConversation.update({
      where: { customerNumber: phone },
      data: {
        activeCart: JSON.stringify(cart),
      },
    });

    return {
      success: true,
      item: { id: item.id, name: item.name, price: Number(item.price) },
      newQuantity: cart[item.id],
    };
  }

  /**
   * Removes an item from the customer's cart
   */
  static async removeItemFromCart(phone: string, itemResolvable: string) {
    const item = await this.resolveMenuItem(itemResolvable);
    if (!item) {
      return { success: false, error: `Food item "${itemResolvable}" not found in menu.` };
    }

    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { customerNumber: phone },
    });

    if (!conversation || !conversation.activeCart) {
      return { success: false, error: "Cart is empty." };
    }

    let cart: Record<string, number> = {};
    try {
      cart = JSON.parse(conversation.activeCart);
    } catch (e) {
      cart = {};
    }

    if (cart[item.id] !== undefined) {
      delete cart[item.id];
    } else {
      return { success: false, error: `"${item.name}" was not in your cart.` };
    }

    await prisma.whatsAppConversation.update({
      where: { customerNumber: phone },
      data: {
        activeCart: JSON.stringify(cart),
      },
    });

    return { success: true, removedItem: item.name };
  }

  /**
   * Clears the cart
   */
  static async clearCart(phone: string) {
    await prisma.whatsAppConversation.update({
      where: { customerNumber: phone },
      data: { activeCart: null },
    });
    return { success: true };
  }

  /**
   * Retrieves cart summary as a formatted text block and totals
   */
  static async getCart(phone: string) {
    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { customerNumber: phone },
    });

    if (!conversation || !conversation.activeCart) {
      return { textSummary: "Aapka cart khali hai.", total: 0, items: [] };
    }

    let cart: Record<string, number> = {};
    try {
      cart = JSON.parse(conversation.activeCart);
    } catch (e) {
      cart = {};
    }

    const itemIds = Object.keys(cart);
    if (itemIds.length === 0) {
      return { textSummary: "Aapka cart khali hai.", total: 0, items: [] };
    }

    const dbItems = await prisma.menuItem.findMany({
      where: { id: { in: itemIds } },
    });

    let textSummary = "🛒 *Cart Details:*\n\n";
    let subtotal = 0;
    const itemsList: any[] = [];

    dbItems.forEach((item) => {
      const qty = cart[item.id] || 0;
      if (qty > 0) {
        const itemCost = Number(item.price) * qty;
        subtotal += itemCost;
        itemsList.push({ id: item.id, name: item.name, quantity: qty, price: Number(item.price), cost: itemCost });
        textSummary += `▪️ *${item.name}* (x${qty}) — ₹${itemCost.toFixed(0)}\n`;
      }
    });

    const tax = subtotal * 0.05;
    const total = subtotal + tax;

    textSummary += `\n-------------------------\n`;
    textSummary += `*Subtotal*: ₹${subtotal.toFixed(0)}\n`;
    textSummary += `*GST (5%)*: ₹${tax.toFixed(0)}\n`;
    textSummary += `*Grand Total*: *₹${total.toFixed(0)}*\n`;

    return { textSummary, subtotal, tax, total, items: itemsList };
  }

  /**
   * Save customer profile name
   */
  static async saveCustomerName(phone: string, name: string) {
    const customer = await prisma.customer.upsert({
      where: { whatsappNumber: phone },
      update: { name },
      create: { whatsappNumber: phone, name },
    });
    return { success: true, name: customer.name };
  }

  /**
   * Save customer delivery address
   */
  static async saveAddress(phone: string, address: string) {
    const customer = await prisma.customer.upsert({
      where: { whatsappNumber: phone },
      update: { address },
      create: { whatsappNumber: phone, address },
    });
    return { success: true, address: customer.address };
  }

  /**
   * Set Session Conversation State
   */
  static async setSessionState(phone: string, state: string) {
    await prisma.whatsAppConversation.update({
      where: { customerNumber: phone },
      data: { state },
    });
    return { success: true, state };
  }

  /**
   * Places a PENDING order in the database
   */
  static async createPendingOrder(phone: string, deliveryType: "DELIVERY" | "PICKUP" | "DINE_IN" = "DELIVERY") {
    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { customerNumber: phone },
      include: { customer: true },
    });

    if (!conversation || !conversation.activeCart) {
      return { success: false, error: "Cart is empty. Cannot place order." };
    }

    let cart: Record<string, number> = {};
    try {
      cart = JSON.parse(conversation.activeCart);
    } catch (e) {
      return { success: false, error: "Invalid cart JSON." };
    }

    const itemsInput = Object.keys(cart).map((itemId) => ({
      menuItemId: itemId,
      quantity: cart[itemId],
    }));

    if (itemsInput.length === 0) {
      return { success: false, error: "Cart is empty. Cannot place order." };
    }

    const customerName = conversation.customer?.name || `Customer ${phone.slice(-4)}`;
    const address = conversation.customer?.address || undefined;

    try {
      const order = await OrderService.createOrder({
        whatsappNumber: phone,
        customerName,
        deliveryType: deliveryType as any,
        deliveryAddress: address,
        notes: "Placed via Chef Sanjay AI. Awaiting admin review.",
        items: itemsInput,
      });

      // Clear cart and update conversation state to AWAITING_ADMIN_APPROVAL
      await prisma.whatsAppConversation.update({
        where: { customerNumber: phone },
        data: {
          state: "AWAITING_ADMIN_APPROVAL",
          activeCart: null,
        },
      });

      return {
        success: true,
        orderNo: order?.orderNo,
        total: Number(order?.totalAmount),
        status: order?.status,
      };
    } catch (err: any) {
      console.error("❌ Tools order creation failed:", err);
      return { success: false, error: err.message || "Failed to persist pending order." };
    }
  }

  /**
   * Books a table reservation request
   */
  static async createTableBookingRequest(phone: string, details: BookingDetails) {
    const customer = await prisma.customer.findUnique({
      where: { whatsappNumber: phone },
    });

    if (!customer) {
      return { success: false, error: "Customer profile not found." };
    }

    const restaurant = await prisma.restaurant.findFirst() || await prisma.restaurant.create({ data: { name: "Mirch Masala" } });
    const bookingCount = await prisma.tableBooking.count();
    const bookingNo = `BK-${1001 + bookingCount}`;

    let bookingDate = new Date();
    const today = new Date();
    const dateLower = (details.dateStr || "today").toLowerCase();

    if (dateLower.includes("tomorrow")) {
      bookingDate.setDate(today.getDate() + 1);
    } else if (dateLower.includes("day after")) {
      bookingDate.setDate(today.getDate() + 2);
    } else {
      // Try to parse string date directly or default today
      try {
        const parsed = new Date(dateLower);
        if (!isNaN(parsed.getTime())) {
          bookingDate = parsed;
        }
      } catch (e) {}
    }

    const booking = await prisma.tableBooking.create({
      data: {
        bookingNo,
        customerId: customer.id,
        restaurantId: restaurant.id,
        guestCount: details.guestCount || 2,
        bookingDate,
        bookingTime: details.timeSlot || "7:30 PM",
        status: "PENDING",
      },
    });

    // Reset state to MAIN_MENU
    await prisma.whatsAppConversation.update({
      where: { customerNumber: phone },
      data: { state: "MAIN_MENU", activeCart: null },
    });

    return {
      success: true,
      bookingNo: booking.bookingNo,
      guestCount: booking.guestCount,
      bookingTime: booking.bookingTime,
      dateStr: details.dateStr || "Today",
    };
  }

  /**
   * Standardizes order status tracking queries
   */
  static async getOrderStatus(phone: string) {
    const latestOrder = await prisma.order.findFirst({
      where: { customer: { whatsappNumber: phone } },
      orderBy: { createdAt: "desc" },
    });

    if (!latestOrder) {
      return { success: false, error: "Aapka koi active order nahi mila." };
    }

    return {
      success: true,
      orderNo: latestOrder.orderNo,
      status: latestOrder.status,
      total: Number(latestOrder.totalAmount),
      paymentStatus: latestOrder.paymentStatus,
    };
  }
}
