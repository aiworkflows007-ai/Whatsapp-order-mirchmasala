import prisma from "@/lib/prisma";
import { RestaurantTools } from "./tools";

export interface FallbackAgentResult {
  reply: string;
  actions: any[];
}

export class FallbackAgent {
  /**
   * High-fidelity local rule-based intent and action parser for offline fallbacks.
   * Dynamically modifies database session states and cart contents using regex matches.
   */
  static async parseQuery(query: string, phone: string): Promise<FallbackAgentResult | null> {
    const q = query.toLowerCase().trim();

    // 1. CLEAR CART
    if (q.includes("clear") || q.includes("empty") || q.includes("khali")) {
      return {
        reply: "Done! ✅ Cart clear ho gaya hai. Naya food add karne ke liye type karein ya niche click karein! 🥣",
        actions: [
          { type: "CLEAR_CART", params: {} },
          { type: "SET_STATE", params: { state: "MAIN_MENU" } }
        ],
      };
    }

    // 2. SHOW MENU
    if (q.includes("menu") || q.includes("list") || q.includes("dishes") || q.includes("khaane me kya hai") || q.includes("card")) {
      return {
        reply: "Ji bilkul! Hamare special Mughlai aur Tandoori dishes niche categories me check karein. Kripya click karke explore karein: 🍽️",
        actions: [
          { type: "SET_STATE", params: { state: "VIEW_CATEGORIES" } }
        ],
      };
    }

    // 3. TABLE BOOKING
    if (q.includes("book") || q.includes("reserve") || q.includes("table") || q.includes("seat") || q.includes("booking")) {
      // Parse guest count
      let guestCount = 2;
      const guestMatch = q.match(/(\d+)\s*(guest|people|bande|log|seat)/);
      if (guestMatch) {
        guestCount = parseInt(guestMatch[1], 10);
      }

      // Parse date
      let dateStr = "Today";
      if (q.includes("tomorrow") || q.includes("kal")) {
        dateStr = "Tomorrow";
      } else if (q.includes("day after")) {
        dateStr = "Day After";
      }

      return {
        reply: `Ji zaroor! Maine aapki table reservation ki details update kar di hain:\n👉 *${guestCount} Guests*\n👉 *Date: ${dateStr}*\n👉 *Time: 7:30 PM*\n\nReservation complete karne ke liye niche **Confirm Booking** click karein! 📅`,
        actions: [
          {
            type: "BOOK_TABLE",
            params: {
              guestCount,
              dateStr,
              timeSlot: "7:30 PM",
              confirm: false, // stage review first
            },
          },
        ],
      };
    }

    // 4. ADD ITEMS TO CART
    // Try to match quantity and food keywords (e.g., "2 Butter Naan add karo" or "add 1 paneer")
    const addKeywords = ["add", "karo", "bhej", "chahiye", "lelo", "mangwa"];
    const isAdding = addKeywords.some(kw => q.includes(kw)) || q.match(/\b\d+\b/); // Contains a number

    if (isAdding) {
      // Extract quantity (default 1)
      let quantity = 1;
      const qtyMatch = q.match(/(\d+)/);
      if (qtyMatch) {
        quantity = parseInt(qtyMatch[1], 10);
      }

      // Resolve dynamic menu items matching keywords
      const menuItems = await prisma.menuItem.findMany({ where: { isAvailable: true } });
      let matchedItem = null;

      for (const item of menuItems) {
        const itemNameLower = item.name.toLowerCase();
        // If query contains the item name words (e.g. "butter naan" or "paneer tikka")
        const words = itemNameLower.split(/\s+/).filter(w => w.length > 2); // only match words longer than 2 chars
        if (words.length > 0 && words.every(word => q.includes(word))) {
          matchedItem = item;
          break;
        }
      }

      // Fallback: check simple keyword inside item name
      if (!matchedItem) {
        matchedItem = menuItems.find(item => {
          const name = item.name.toLowerCase();
          if (q.includes("paneer") && name.includes("paneer")) return true;
          if (q.includes("chicken") && name.includes("chicken")) return true;
          if (q.includes("naan") && name.includes("naan")) return true;
          if (q.includes("roti") && name.includes("roti")) return true;
          if (q.includes("chai") && name.includes("chai")) return true;
          if (q.includes("gulab") && name.includes("gulab")) return true;
          return false;
        });
      }

      if (matchedItem) {
        return {
          reply: `Bilkul! Cart me *${matchedItem.name}* (x${quantity}) add kar diya hai. 😋\n\nCart review choose karein, ya aur kuch order karne ke liye type karein:`,
          actions: [
            {
              type: "ADD_TO_CART",
              params: {
                itemId: matchedItem.id,
                itemName: matchedItem.name,
                quantity,
              },
            },
            {
              type: "SET_STATE",
              params: {
                state: "CART_REVIEW",
              },
            },
          ],
        };
      }
    }

    // 5. HUMAN STAFF ESCALATION
    if (q.includes("human") || q.includes("staff") || q.includes("manager") || q.includes("help") || q.includes("complain")) {
      return {
        reply: "Bilkul! Main Mirch Masala staff ko direct ping kar raha hoon. Kripya thoda wait karein. 🙏",
        actions: [
          {
            type: "REQUEST_HANDOFF",
            params: { reason: "User requested human staff" },
          },
        ],
      };
    }

    return null;
  }
}
