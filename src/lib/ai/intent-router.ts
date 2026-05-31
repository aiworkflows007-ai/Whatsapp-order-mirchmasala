import prisma from "@/lib/prisma";
import { WhatsAppTemplates } from "../whatsapp/templates";
import { WhatsAppClient } from "../whatsapp/client";
import { RestaurantTools } from "./tools";

export class IntentRouter {
  /**
   * Deterministically routes specific plain text command keywords to native flows
   * Returns a static reply if matched, or null to indicate it should be routed to AI
   */
  static async routeIntent(phone: string, cleanContent: string): Promise<{ reply: string; matched: boolean } | null> {
    const q = cleanContent.toUpperCase().trim();

    // 1. Reset / Start / Hello / Hi
    if (q === "RESET" || q === "START" || q === "MENU" || q === "HI" || q === "HELLO" || q === "HEY" || q === "NAMASTE") {
      await prisma.whatsAppConversation.upsert({
        where: { customerNumber: phone },
        update: { state: "MAIN_MENU", activeCart: null, currentCategoryId: null },
        create: { customerNumber: phone, state: "MAIN_MENU", activeCart: null, currentCategoryId: null },
      });
      
      await WhatsAppTemplates.sendWelcomeMenu(phone);
      
      return {
        reply: "Namaste! Welcome to Mirch Masala. Main menu details have been sent to you! 🌶️🍲\n\nChoose an option from the buttons below:",
        matched: true,
      };
    }

    // 2. View Cart Quick Command
    if (q === "CART" || q === "VIEW CART" || q === "VIEW_CART" || q === "MY CART") {
      const cartDetails = await RestaurantTools.getCart(phone);
      
      await prisma.whatsAppConversation.update({
        where: { customerNumber: phone },
        data: { state: "CART_REVIEW" },
      });

      await WhatsAppTemplates.sendCartReviewOptions(phone, cartDetails.textSummary);
      
      return {
        reply: "Cart ready. Checkout button tap karein.",
        matched: true,
      };
    }

    // 3. Clear Cart Quick Command
    if (q === "CLEAR" || q === "CLEAR CART" || q === "EMPTY CART") {
      await RestaurantTools.clearCart(phone);
      
      const reply = "Done! ✅ Aapka cart clear ho gaya hai. Naya order shuru karne ke liye niche button select karein ya item type karein.";
      
      await WhatsAppClient.sendTextMessage(phone, reply);
      await WhatsAppTemplates.sendWelcomeMenu(phone);
      
      return {
        reply,
        matched: true,
      };
    }

    // 4. Order Tracking Quick Command
    if (q === "TRACK" || q === "TRACK ORDER" || q === "STATUS" || q === "TRACK_ORDER") {
      const statusRes = await RestaurantTools.getOrderStatus(phone);
      if (!statusRes.success) {
        const reply = statusRes.error || "Active order nahi mila. MENU se fresh start karein.";
        await WhatsAppClient.sendTextMessage(phone, reply);
        return {
          reply,
          matched: true,
        };
      }

      const statusText = `🛵 *Live Order Tracker: #${statusRes.orderNo}*\nStatus: *${statusRes.status}*\nTotal: ₹${statusRes.total?.toFixed(2)}\nPayment Status: *${statusRes.paymentStatus}*`;
      await WhatsAppClient.sendTextMessage(phone, statusText);
      
      return {
        reply: statusText,
        matched: true,
      };
    }

    // 5. Human Handoff Command
    if (q === "HUMAN" || q === "STAFF" || q === "OWNER" || q === "SUPPORT" || q === "HELP") {
      const handoffMsg = "Bilkul! 👨‍🍳 Main request staff ko forward kar raha hoon. Thoda wait karein, wo aapse connect karenge. Dhanyawad! 🙏";
      
      await prisma.whatsAppConversation.update({
        where: { customerNumber: phone },
        data: { state: "MAIN_MENU" }, // Keep in menu context
      });

      await WhatsAppClient.sendTextMessage(phone, handoffMsg);
      
      return {
        reply: handoffMsg,
        matched: true,
      };
    }

    return null;
  }
}
