import prisma from "@/lib/prisma";

export interface CustomerSession {
  phone: string;
  profileName?: string;
  customerName?: string;
  currentCart: Record<string, number>;
  orderType: "DELIVERY" | "PICKUP" | "DINE_IN" | "UNKNOWN";
  address?: string;
  tableNumber?: string;
  state: string;
  handoffRequested: boolean;
  updatedAt: Date;
}

export class CustomerSessionService {
  /**
   * Retrieves a unified CustomerSession object from the database
   */
  static async getSession(phone: string, defaultProfileName?: string): Promise<CustomerSession> {
    // 1. Resolve or Create the Conversation State inside the database
    let session = await prisma.whatsAppConversation.findUnique({
      where: { customerNumber: phone },
      include: { customer: true },
    });

    if (!session) {
      // Find or create customer
      let customer = await prisma.customer.findUnique({
        where: { whatsappNumber: phone },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            whatsappNumber: phone,
            name: defaultProfileName || `Guest ${phone.slice(-4)}`,
          },
        });
      }

      session = await prisma.whatsAppConversation.create({
        data: {
          customerNumber: phone,
          state: "START",
        },
        include: { customer: true },
      });
    }

    // Load active cart (represented as a JSON dictionary itemId -> quantity)
    let cart: Record<string, number> = {};
    if (session.activeCart) {
      try {
        cart = JSON.parse(session.activeCart);
      } catch (e) {
        cart = {};
      }
    }

    // Resolve order type from session context/active booking state
    let orderType: CustomerSession["orderType"] = "UNKNOWN";
    if (session.state.startsWith("BOOKING_") || (session.activeCart && session.activeCart.includes("isBooking"))) {
      orderType = "DINE_IN";
    }

    // Check if custom delivery type has been written to the session cart context
    let address = session.customer?.address || undefined;
    let tableNumber = undefined;

    return {
      phone,
      profileName: defaultProfileName || session.customer?.name || undefined,
      customerName: session.customer?.name || undefined,
      currentCart: cart,
      orderType,
      address,
      tableNumber,
      state: session.state,
      handoffRequested: false, // Default false, overridden if handoff flags are set
      updatedAt: session.updatedAt,
    };
  }

  /**
   * Updates customer profile or conversation state in the DB
   */
  static async updateSession(phone: string, updates: Partial<CustomerSession>) {
    const dataToUpdate: any = {};

    if (updates.state) {
      dataToUpdate.state = updates.state;
    }

    if (updates.currentCart) {
      dataToUpdate.activeCart = JSON.stringify(updates.currentCart);
    }

    if (Object.keys(dataToUpdate).length > 0) {
      await prisma.whatsAppConversation.update({
        where: { customerNumber: phone },
        data: dataToUpdate,
      });
    }

    const customerUpdates: any = {};
    if (updates.customerName) {
      customerUpdates.name = updates.customerName;
    }
    if (updates.address) {
      customerUpdates.address = updates.address;
    }

    if (Object.keys(customerUpdates).length > 0) {
      await prisma.customer.update({
        where: { whatsappNumber: phone },
        data: customerUpdates,
      });
    }

    return this.getSession(phone);
  }
}
