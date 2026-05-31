import prisma from "@/lib/prisma";
import { WhatsAppParser, IncomingMessage } from "./parser";
import { WhatsAppTemplates } from "./templates";
import { WhatsAppClient } from "./client";
import { WhatsAppAIAgent } from "./ai-agent";
import { OrderService, DeliveryType } from "@/lib/orders/order-service";
import { IntentRouter } from "../ai/intent-router";
import { AIRestaurantAgent } from "../ai/restaurant-agent";
import { envValue } from "@/lib/env-values";


export interface BotReply {
  replyText: string;
  replyType: "text" | "categories" | "menu" | "cart" | "checkout_details" | "order_success" | "tracking" | "payment_qr" | "payment_link";
  payload?: any;
}

export class WhatsAppConversationEngine {
  private static wantsMenuFromText(text: string) {
    const q = text.toUpperCase().trim();
    const normalized = q.replace(/[^A-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    const exactMenuWords = new Set([
      "YES",
      "Y",
      "HA",
      "HAN",
      "HAAN",
      "OK",
      "OKAY",
      "SURE",
      "MENU",
      "ORDER",
      "FOOD",
      "KHANA",
      "KHAANA",
    ]);

    return (
      exactMenuWords.has(normalized) ||
      normalized.includes("MENU") ||
      normalized.includes("ORDER") ||
      normalized.includes("KHANA") ||
      normalized.includes("KHAANA") ||
      normalized.includes("DEKHNA")
    );
  }

  private static async openMenuCategories(from: string): Promise<BotReply> {
    const categories = await prisma.category.findMany({
      orderBy: { position: "asc" },
    });

    await prisma.whatsAppConversation.update({
      where: { customerNumber: from },
      data: { state: "VIEW_CATEGORIES" },
    });

    await WhatsAppTemplates.sendCategoriesMenu(from, categories);

    return {
      replyText: "Menu ready. Category tap karein.",
      replyType: "categories",
      payload: {
        options: categories.map((cat) => ({
          label: `📁 ${cat.name}`,
          action: `SELECT_CAT_${cat.id}`,
        })),
      },
    };
  }

  /**
   * Main entry point to process an inbound conversational message
   * Returns a BotReply containing reply details and nextState for simulator/JSON consumption
   */
  static async processMessage(incoming: IncomingMessage): Promise<BotReply> {
    const from = incoming.from;
    const cleanContent = incoming.content.trim();
    const action = incoming.actionPayload || "";

    console.log(`🤖 [Conversation Engine] Incoming from: ${from} | Content: "${cleanContent}" | Action: "${action}"`);

    // 1. Resolve or Create the Conversation State inside the database
    let session = await prisma.whatsAppConversation.findUnique({
      where: { customerNumber: from },
      include: { customer: true },
    });

    if (!session) {
      // Find or create customer
      let customer = await prisma.customer.findUnique({
        where: { whatsappNumber: from },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            whatsappNumber: from,
            name: incoming.profileName || `Guest ${from.slice(-4)}`,
          },
        });
      }

      session = await prisma.whatsAppConversation.create({
        data: {
          customerNumber: from,
          state: "START",
        },
        include: { customer: true },
      });
    }

    // Save WhatsApp inbound log in DB
    try {
      await prisma.whatsAppMessageLog.create({
        data: {
          customerNumber: from,
          direction: "INBOUND",
          messageType: incoming.type === "interactive" ? "button_reply" : "text",
          content: cleanContent,
          rawPayload: JSON.stringify(incoming),
        },
      });
    } catch (err) {
      console.error("❌ Failed to log inbound WhatsApp message:", err);
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

    const structuredTextStates = new Set([
      "AWAITING_NAME",
      "AWAITING_ADDRESS",
      "AWAITING_ADDRESS_CONFIRM",
      "AWAITING_TABLE_NO",
      "BOOKING_GUEST_COUNT",
      "BOOKING_DATE",
      "BOOKING_TIME",
      "BOOKING_CONFIRM",
      "AWAITING_PAYMENT_CONFIRM",
    ]);

    // --- STAFF TAKEOVER HANDOFF GUARD ---
    if (session.state === "HANDOFF") {
      console.log(`🔕 [Staff Takeover] Muting AI and automated state machine for ${from}. Conversation is handled manually.`);
      return {
        replyText: "Takeover Mode Active. Silent logging.",
        replyType: "text",
      };
    }

    // --- CONVERSATIONAL AI AGENT & INTENT ROUTER INTERCEPT ---
    if (incoming.type === "text" && !action && !structuredTextStates.has(session.state) && !["START", "MAIN_MENU"].includes(session.state)) {
      // 1. Zero-latency Deterministic Intent Router
      const routed = await IntentRouter.routeIntent(from, cleanContent);
      if (routed && routed.matched) {
        return {
          replyText: routed.reply,
          replyType: "text",
        };
      }

      // 2. State-aware Chef Sanjay Conversational AI Agent
      const aiResult = await AIRestaurantAgent.handleRestaurantAIMessage({
        phone: from,
        profileName: incoming.profileName,
        message: cleanContent,
      });

      // Send the main warm AI text response to the customer's WhatsApp
      await WhatsAppClient.sendTextMessage(from, aiResult.reply);

      // 3. Dynamic State UI Flow Control: Reload session state to offer the correct touch templates!
      const reloadedSession = await prisma.whatsAppConversation.findUnique({
        where: { customerNumber: from },
      });
      const newState = reloadedSession?.state || "MAIN_MENU";

      if (newState === "AWAITING_DELIVERY_TYPE") {
        await WhatsAppTemplates.sendDeliveryOptions(from, incoming.profileName || "Customer");
      } else if (newState === "AWAITING_PAYMENT") {
        const cartSummary = await this.getCartSummaryMessage(aiResult.session.currentCart);
        await WhatsAppTemplates.sendPaymentOptions(from, cartSummary.textSummary);
      } else if (newState === "BOOKING_CONFIRM") {
        let bookingData = { guestCount: 2, dateStr: "Today", timeSlot: "7:30 PM" };
        try {
          bookingData = JSON.parse(reloadedSession?.activeCart || "{}");
        } catch (e) {}
        await WhatsAppTemplates.sendBookingConfirmation(from, bookingData);
      } else if (newState === "CART_REVIEW") {
        const cartSummary = await this.getCartSummaryMessage(aiResult.session.currentCart);
        await WhatsAppTemplates.sendCartReviewOptions(from, cartSummary.textSummary);
      } else if (newState === "MAIN_MENU") {
        await WhatsAppTemplates.sendWelcomeMenu(from);
      }

      return {
        replyText: aiResult.reply,
        replyType: "text",
        payload: aiResult,
      };
    }

    // Prepare reply state
    let state = session.state;
    let nextCategoryId = session.currentCategoryId;
    let replyText = "";
    let replyType: BotReply["replyType"] = "text";
    let payload: any = undefined;

    // --- SYSTEM RESET TRIGGER ---
    if (cleanContent.toUpperCase() === "RESET" || cleanContent.toUpperCase() === "START" || cleanContent.toUpperCase() === "MENU") {
      await prisma.whatsAppConversation.update({
        where: { customerNumber: from },
        data: { state: "MAIN_MENU", activeCart: null, currentCategoryId: null },
      });
      await WhatsAppTemplates.sendWelcomeMenu(from);
      return {
        replyText: "Namaste! Welcome back to Mirch Masala. Choose an option:",
        replyType: "categories",
        payload: {
          options: [
            { label: "🍽️ View Menu & Order", action: "BROWSE_MENU" },
            { label: "📅 Book a Table", action: "BOOK_TABLE" },
            { label: "🛵 Track My Order", action: "TRACK_ORDER" },
          ]
        }
      };
    }

    // =========================================================================
    // STATE MACHINE TRANSITIONS
    // =========================================================================

    switch (state) {
      case "START": {
        // First contact or fresh session
        await prisma.whatsAppConversation.update({
          where: { customerNumber: from },
          data: { state: "MAIN_MENU" },
        });

        if (action === "BROWSE_MENU" || this.wantsMenuFromText(cleanContent)) {
          return this.openMenuCategories(from);
        }

        if (action === "BOOK_TABLE") {
          await prisma.whatsAppConversation.update({
            where: { customerNumber: from },
            data: { state: "BOOKING_GUEST_COUNT", activeCart: JSON.stringify({ isBooking: true }) },
          });
          await WhatsAppTemplates.sendBookingGuestCount(from);
          return {
            replyText: "Guests choose karein.",
            replyType: "text",
          };
        }

        if (action === "TRACK_ORDER") {
          const latestOrder = await prisma.order.findFirst({
            where: { customer: { whatsappNumber: from } },
            orderBy: { createdAt: "desc" },
          });

          const msg = latestOrder
            ? `Order #${latestOrder.orderNo}: ${latestOrder.status}. Total ₹${Number(latestOrder.totalAmount).toFixed(2)}.`
            : "Active order nahi mila.";
          await WhatsAppClient.sendTextMessage(from, msg);
          return {
            replyText: msg,
            replyType: "tracking",
            payload: latestOrder || undefined,
          };
        }

        await WhatsAppTemplates.sendWelcomeMenu(from);
        
        return {
          replyText: "Namaste! Button choose karein.",
          replyType: "categories",
          payload: {
            options: [
              { label: "🍽️ View Menu & Order", action: "BROWSE_MENU" },
              { label: "📅 Book a Table", action: "BOOK_TABLE" },
              { label: "🛵 Track My Order", action: "TRACK_ORDER" },
            ]
          }
        };
      }

      case "MAIN_MENU": {
        if (action === "BROWSE_MENU" || cleanContent.includes("1") || this.wantsMenuFromText(cleanContent)) {
          return this.openMenuCategories(from);
        }

        if (action === "BOOK_TABLE" || cleanContent.includes("2") || cleanContent.toUpperCase().includes("BOOK")) {
          await prisma.whatsAppConversation.update({
            where: { customerNumber: from },
            data: { state: "BOOKING_GUEST_COUNT", activeCart: JSON.stringify({ isBooking: true }) },
          });
          await WhatsAppTemplates.sendBookingGuestCount(from);
          return {
            replyText: "Kitne guests ke liye table reserve karna chahte hain? Please choose an option:",
            replyType: "text",
          };
        }

        if (action === "TRACK_ORDER" || cleanContent.includes("3") || cleanContent.toUpperCase().includes("TRACK")) {
          // Find latest order for customer
          const latestOrder = await prisma.order.findFirst({
            where: { customer: { whatsappNumber: from } },
            orderBy: { createdAt: "desc" },
            include: { customer: true },
          });

          if (!latestOrder) {
            await prisma.whatsAppConversation.update({
              where: { customerNumber: from },
              data: { state: "MAIN_MENU" },
            });
            await WhatsAppClient.sendTextMessage(from, "❌ Hamare records me aapka koi active order nahi mila.");
            await WhatsAppTemplates.sendWelcomeMenu(from);

            return {
              replyText: "No active orders found. Welcome to Mirch Masala! Choose an option:",
              replyType: "categories",
              payload: {
                options: [
                  { label: "🍽️ View Menu & Order", action: "BROWSE_MENU" },
                  { label: "📅 Book a Table", action: "BOOK_TABLE" },
                  { label: "🛵 Track My Order", action: "TRACK_ORDER" },
                ]
              }
            };
          }

          // Transition to ORDER_TRACKING state
          await prisma.whatsAppConversation.update({
            where: { customerNumber: from },
            data: { state: "ORDER_TRACKING" },
          });

          const statusText = `🛵 Live Order Status Tracker: #${latestOrder.orderNo}\nStatus: *${latestOrder.status}*\nTotal: ₹${Number(latestOrder.totalAmount).toFixed(2)}`;
          await WhatsAppClient.sendTextMessage(from, statusText);

          return {
            replyText: statusText,
            replyType: "tracking",
            payload: latestOrder,
          };
        }

        // AI Conversational Fallback: Processes custom text queries via Chef Sanjay
        const aiResponse = await WhatsAppAIAgent.processQuery(cleanContent, from);
        await WhatsAppClient.sendTextMessage(from, aiResponse);
        await WhatsAppTemplates.sendWelcomeMenu(from);
        return {
          replyText: aiResponse,
          replyType: "categories",
          payload: {
            options: [
              { label: "🍽️ View Menu", action: "BROWSE_MENU" },
              { label: "📅 Book Table", action: "BOOK_TABLE" },
              { label: "🛵 Track Order", action: "TRACK_ORDER" },
            ]
          }
        };
      }

      case "VIEW_CATEGORIES": {
        if (action === "BACK_TO_MAIN" || cleanContent.toUpperCase() === "BACK") {
          await prisma.whatsAppConversation.update({
            where: { customerNumber: from },
            data: { state: "MAIN_MENU", activeCart: null },
          });
          await WhatsAppTemplates.sendWelcomeMenu(from);
          return {
            replyText: "Welcome to Mirch Masala! Choose an option:",
            replyType: "categories",
            payload: {
              options: [
                { label: "🍽️ View Menu & Order", action: "BROWSE_MENU" },
                { label: "📅 Book a Table", action: "BOOK_TABLE" },
                { label: "🛵 Track My Order", action: "TRACK_ORDER" },
              ]
            }
          };
        }

        if (action.startsWith("SELECT_CAT_")) {
          const catId = action.replace("SELECT_CAT_", "");
          const category = await prisma.category.findUnique({
            where: { id: catId },
            include: { menuItems: { where: { isAvailable: true }, orderBy: { position: "asc" } } },
          });

          if (category) {
            await prisma.whatsAppConversation.update({
              where: { customerNumber: from },
              data: { state: "VIEW_ITEMS", currentCategoryId: catId },
            });

            await WhatsAppTemplates.sendItemsMenu(from, category.name, category.menuItems);

            return {
              replyText: `*${category.name}* dishes ready. Dish tap karein.`,
              replyType: "menu",
              payload: { categoryId: category.id },
            };
          }
        }

        // Fallback: Resend categories menu
        const categories = await prisma.category.findMany({ orderBy: { position: "asc" } });
        await WhatsAppTemplates.sendCategoriesMenu(from, categories);
        return {
          replyText: "Kripya select categories niche list me se:",
          replyType: "categories",
          payload: {
            options: categories.map((cat) => ({ label: `📁 ${cat.name}`, action: `SELECT_CAT_${cat.id}` })),
          }
        };
      }

      case "VIEW_ITEMS": {
        if (action === "BACK_TO_MAIN") {
          await prisma.whatsAppConversation.update({
            where: { customerNumber: from },
            data: { state: "MAIN_MENU", activeCart: null, currentCategoryId: null },
          });
          await WhatsAppTemplates.sendWelcomeMenu(from);
          return {
            replyText: "Welcome to Mirch Masala! Choose an option:",
            replyType: "categories",
            payload: {
              options: [
                { label: "🍽️ View Menu & Order", action: "BROWSE_MENU" },
                { label: "📅 Book a Table", action: "BOOK_TABLE" },
                { label: "🛵 Track My Order", action: "TRACK_ORDER" },
              ]
            }
          };
        }

        if (action.startsWith("SELECT_CAT_")) {
          const catId = action.replace("SELECT_CAT_", "");
          const category = await prisma.category.findUnique({
            where: { id: catId },
            include: { menuItems: { where: { isAvailable: true }, orderBy: { position: "asc" } } },
          });

          if (category) {
            await prisma.whatsAppConversation.update({
              where: { customerNumber: from },
              data: { currentCategoryId: catId },
            });
            await WhatsAppTemplates.sendItemsMenu(from, category.name, category.menuItems);
            return {
              replyText: `Showing dishes inside *${category.name}*`,
              replyType: "menu",
              payload: { categoryId: category.id },
            };
          }
        }

        if (action.startsWith("ADD_ITEM_")) {
          const itemId = action.replace("ADD_ITEM_", "");
          const menuItem = await prisma.menuItem.findUnique({
            where: { id: itemId },
            include: { category: true },
          });

          if (menuItem) {
            const currentQty = cart[itemId] || 0;
            cart[itemId] = currentQty + 1;

            // Save cart to DB
            await prisma.whatsAppConversation.update({
              where: { customerNumber: from },
              data: { activeCart: JSON.stringify(cart) },
            });

            const count = cart[itemId];
            const msg = `Added *${menuItem.name}* x${count} ✅\nAur add karein ya cart dekhein.`;
            await WhatsAppTemplates.sendPostAddItemOptions(from, msg, menuItem.categoryId);

            return {
              replyText: msg,
              replyType: "menu",
              payload: { categoryId: menuItem.categoryId },
            };
          }
        }

        // View active cart trigger
        if (action === "VIEW_CART" || cleanContent.toUpperCase().includes("CART") || cleanContent.toUpperCase().includes("VIEW")) {
          await prisma.whatsAppConversation.update({
            where: { customerNumber: from },
            data: { state: "CART_REVIEW" },
          });

          const summary = await this.getCartSummaryMessage(cart);
          await WhatsAppTemplates.sendCartReviewOptions(from, summary.textSummary);

          return {
            replyText: "Cart ready. Checkout button tap karein.",
            replyType: "cart",
          };
        }

        // Fallback: list items in current category
        if (nextCategoryId) {
          const category = await prisma.category.findUnique({
            where: { id: nextCategoryId },
            include: { menuItems: { where: { isAvailable: true }, orderBy: { position: "asc" } } },
          });
          if (category) {
            await WhatsAppTemplates.sendItemsMenu(from, category.name, category.menuItems);
            return {
              replyText: `Showing dishes inside *${category.name}*`,
              replyType: "menu",
              payload: { categoryId: category.id },
            };
          }
        }

        // Fallback categories list
        const categories = await prisma.category.findMany({ orderBy: { position: "asc" } });
        await WhatsAppTemplates.sendCategoriesMenu(from, categories);
        return {
          replyText: "Category choose karein:",
          replyType: "categories",
          payload: {
            options: categories.map((cat) => ({ label: `📁 ${cat.name}`, action: `SELECT_CAT_${cat.id}` })),
          }
        };
      }

      case "CART_REVIEW": {
        if (action === "CLEAR_CART") {
          await prisma.whatsAppConversation.update({
            where: { customerNumber: from },
            data: { state: "MAIN_MENU", activeCart: null, currentCategoryId: null },
          });
          const msg = "Cart clear ho gaya. Fresh start? 🌶️";
          await WhatsAppClient.sendTextMessage(from, msg);
          await WhatsAppTemplates.sendWelcomeMenu(from);
          return {
            replyText: msg,
            replyType: "categories",
          };
        }

        if (action === "BROWSE_MENU") {
          const categories = await prisma.category.findMany({ orderBy: { position: "asc" } });
          await prisma.whatsAppConversation.update({
            where: { customerNumber: from },
            data: { state: "VIEW_CATEGORIES" },
          });
          await WhatsAppTemplates.sendCategoriesMenu(from, categories);
          return {
            replyText: "Aur dishes add karein.",
            replyType: "categories",
          };
        }

        if (action === "BACK_TO_MAIN") {
          await prisma.whatsAppConversation.update({
            where: { customerNumber: from },
            data: { state: "MAIN_MENU", activeCart: null, currentCategoryId: null },
          });
          await WhatsAppTemplates.sendWelcomeMenu(from);
          return {
            replyText: "Welcome to Mirch Masala! Choose an option:",
            replyType: "categories",
            payload: {
              options: [
                { label: "🍽️ View Menu & Order", action: "BROWSE_MENU" },
                { label: "📅 Book a Table", action: "BOOK_TABLE" },
                { label: "🛵 Track My Order", action: "TRACK_ORDER" },
              ]
            }
          };
        }

        if (action === "CHECKOUT" || cleanContent.toUpperCase().includes("CHECKOUT") || cleanContent.toUpperCase().includes("PROCEED")) {
          // Empty cart validation guard
          if (Object.keys(cart).length === 0) {
            const emptyCartMsg = `Cart khali hai. Pehle ek tasty dish add karein.`;
            await WhatsAppClient.sendTextMessage(from, emptyCartMsg);
            return {
              replyText: emptyCartMsg,
              replyType: "categories",
              payload: {
                options: [
                  { label: "🍽️ View Menu & Order", action: "BROWSE_MENU" },
                  { label: "🏠 Main Menu", action: "BACK_TO_MAIN" }
                ]
              }
            };
          }

          // Zero Typing Optimization:
          // If we are on real WhatsApp, we pre-fill the name with Meta profileName automatically!
          if (incoming.profileName && incoming.profileName.trim()) {
            // Pre-fill customer name in DB
            await prisma.customer.update({
              where: { whatsappNumber: from },
              data: { name: incoming.profileName },
            });

            await prisma.whatsAppConversation.update({
              where: { customerNumber: from },
              data: { state: "AWAITING_DELIVERY_TYPE" },
            });

            await WhatsAppTemplates.sendDeliveryOptions(from, incoming.profileName);

            return {
              replyText: `Thanks *${incoming.profileName}*. Delivery type choose karein.`,
              replyType: "categories",
              payload: {
                options: [
                  { label: "🛵 Home Delivery", action: "CHOOSE_DELIVERY_DELIVERY" },
                  { label: "🥡 Takeaway (Pickup)", action: "CHOOSE_DELIVERY_PICKUP" },
                  { label: "🍽️ Dine-in (Table)", action: "CHOOSE_DELIVERY_DINE_IN" },
                ]
              }
            };
          }

          // Otherwise, ask for name typing
          await prisma.whatsAppConversation.update({
            where: { customerNumber: from },
            data: { state: "AWAITING_NAME" },
          });

          await WhatsAppClient.sendTextMessage(from, "Naam bata dijiye. Bas first name bhi chalega.");

          return {
            replyText: "Naam bata dijiye.",
            replyType: "checkout_details",
          };
        }

        // Standard Cart items preview
        const summary = await this.getCartSummaryMessage(cart);
        return {
          replyText: summary.textSummary,
          replyType: "cart",
        };
      }

      case "AWAITING_NAME": {
        // User typed their name
        await prisma.customer.update({
          where: { whatsappNumber: from },
          data: { name: cleanContent },
        });

        await prisma.whatsAppConversation.update({
          where: { customerNumber: from },
          data: { state: "AWAITING_DELIVERY_TYPE" },
        });

        await WhatsAppTemplates.sendDeliveryOptions(from, cleanContent);

        return {
          replyText: `Dhanyawad *${cleanContent}*. Delivery type choose karein.`,
          replyType: "categories",
          payload: {
            options: [
              { label: "🛵 Home Delivery", action: "CHOOSE_DELIVERY_DELIVERY" },
              { label: "🥡 Takeaway (Pickup)", action: "CHOOSE_DELIVERY_PICKUP" },
              { label: "🍽️ Dine-in (Table)", action: "CHOOSE_DELIVERY_DINE_IN" },
            ]
          }
        };
      }

      case "AWAITING_DELIVERY_TYPE": {
        if (action === "CHOOSE_DELIVERY_DELIVERY") {
          // Ask for address
          await prisma.whatsAppConversation.update({
            where: { customerNumber: from },
            data: { state: "AWAITING_ADDRESS" },
          });
          
          await WhatsAppClient.sendTextMessage(from, "Delivery address bhej dijiye.");

          return {
            replyText: "Delivery address bhej dijiye.",
            replyType: "checkout_details",
          };
        }

        if (action === "CHOOSE_DELIVERY_PICKUP") {
          // Self pickup, proceed directly to payment
          await prisma.whatsAppConversation.update({
            where: { customerNumber: from },
            data: { state: "AWAITING_PAYMENT" },
          });

          // Fetch active summary to show total
          const summary = await this.getCartSummaryMessage(cart);
          const payText = `Takeaway selected. Total ₹${summary.total.toFixed(2)}.`;
          
          return this.placeOrderAndNotifyAdmin(from, cart, DeliveryType.PICKUP, null, null);
        }

        if (action === "CHOOSE_DELIVERY_DINE_IN") {
          // Ask for table number
          await prisma.whatsAppConversation.update({
            where: { customerNumber: from },
            data: { state: "AWAITING_TABLE_NO" },
          });

          await WhatsAppClient.sendTextMessage(from, "Table number bhej dijiye.");

          return {
            replyText: "Table number bhej dijiye.",
            replyType: "checkout_details",
          };
        }

        // Fallback options
        const name = session.customer?.name || "Customer";
        await WhatsAppTemplates.sendDeliveryOptions(from, name);
        return {
          replyText: "Kripya delivery option choose karein:",
          replyType: "categories",
          payload: {
            options: [
              { label: "🛵 Home Delivery", action: "CHOOSE_DELIVERY_DELIVERY" },
              { label: "🥡 Takeaway (Pickup)", action: "CHOOSE_DELIVERY_PICKUP" },
              { label: "🍽️ Dine-in (Table)", action: "CHOOSE_DELIVERY_DINE_IN" },
            ]
          }
        };
      }

      case "AWAITING_ADDRESS": {
        // User typed address
        await prisma.customer.update({
          where: { whatsappNumber: from },
          data: { address: cleanContent },
        });

        await prisma.whatsAppConversation.update({
          where: { customerNumber: from },
          data: { state: "AWAITING_ADDRESS_CONFIRM" },
        });

        await WhatsAppTemplates.sendAddressConfirmation(from, cleanContent);

        return {
          replyText: `Address noted: ${cleanContent}. Confirm karein.`,
          replyType: "checkout_details",
        };
      }

      case "AWAITING_ADDRESS_CONFIRM": {
        const q = cleanContent.toUpperCase().trim();
        const yesWords = ["YES", "Y", "HA", "HAN", "HAAN", "JI", "OK", "OKAY", "CORRECT", "SAHI", "SAHI HAI"];
        const noWords = ["NO", "N", "NA", "NAHI", "NHI", "CHANGE", "EDIT", "WRONG", "GALAT"];
        const isYes = action === "CONFIRM_ADDRESS_YES" || yesWords.includes(q);
        const isNo = action === "CONFIRM_ADDRESS_NO" || noWords.includes(q);

        if (isNo) {
          await prisma.whatsAppConversation.update({
            where: { customerNumber: from },
            data: { state: "AWAITING_ADDRESS" },
          });

          const msg = "Theek hai. Naya delivery address bhej dijiye.";
          await WhatsAppClient.sendTextMessage(from, msg);

          return {
            replyText: msg,
            replyType: "checkout_details",
          };
        }

        if (isYes) {
          const customer = await prisma.customer.findUnique({
            where: { whatsappNumber: from },
          });
          const savedAddress = customer?.address || session.customer?.address || "";

          if (!savedAddress) {
            await prisma.whatsAppConversation.update({
              where: { customerNumber: from },
              data: { state: "AWAITING_ADDRESS" },
            });
            const msg = "Address miss ho gaya. Delivery address dobara bhej dijiye.";
            await WhatsAppClient.sendTextMessage(from, msg);
            return {
              replyText: msg,
              replyType: "checkout_details",
            };
          }

          return this.placeOrderAndNotifyAdmin(from, cart, DeliveryType.DELIVERY, savedAddress, null);
        }

        await prisma.customer.update({
          where: { whatsappNumber: from },
          data: { address: cleanContent },
        });
        await WhatsAppTemplates.sendAddressConfirmation(from, cleanContent);

        return {
          replyText: `Address updated: ${cleanContent}. Confirm karein.`,
          replyType: "checkout_details",
        };
      }

      case "AWAITING_TABLE_NO": {
        // User typed table no
        await prisma.whatsAppConversation.update({
          where: { customerNumber: from },
          data: { state: "AWAITING_PAYMENT" },
        });

        // Set table number in temporary session or notes
        return this.placeOrderAndNotifyAdmin(from, cart, DeliveryType.DINE_IN, null, cleanContent);
      }

      case "AWAITING_PAYMENT": {
        if (action === "CHOOSE_PAYMENT_UPI" || action === "CHOOSE_PAYMENT_CASH" || action === "CHOOSE_PAYMENT_RAZORPAY") {
          return this.handleApprovedPaymentChoice(from, action, session.customer?.name);
        }

        const summary = await this.getCartSummaryMessage(cart);
        const payText = `Total ₹${summary.total.toFixed(2)}. Payment option choose karein.`;
        await WhatsAppTemplates.sendPaymentOptions(from, payText);
        return {
          replyText: payText,
          replyType: "categories",
          payload: {
            options: [
              { label: "💳 UPI / Card", action: "CHOOSE_PAYMENT_RAZORPAY" },
              { label: "💵 COD / Cash", action: "CHOOSE_PAYMENT_CASH" },
            ]
          }
        };
      }

      case "AWAITING_RAZORPAY_PAYMENT": {
        const paymentAction = this.getPaymentAction(action, cleanContent);
        if (paymentAction) {
          return this.handleApprovedPaymentChoice(from, paymentAction, session.customer?.name);
        }

        const latestOrder = await prisma.order.findFirst({
          where: { customer: { whatsappNumber: from } },
          orderBy: { createdAt: "desc" },
        });

        if (latestOrder) {
          const reminderText = `Payment pending hai: #${latestOrder.orderNo}, ₹${Number(latestOrder.totalAmount).toFixed(2)}.\nLink se pay kar dein.`;
          await WhatsAppClient.sendTextMessage(from, reminderText);
          return {
            replyText: reminderText,
            replyType: "tracking",
            payload: latestOrder,
          };
        }

        await prisma.whatsAppConversation.update({
          where: { customerNumber: from },
          data: { state: "MAIN_MENU" },
        });
        await WhatsAppTemplates.sendWelcomeMenu(from);
        return {
          replyText: "Namaste! Welcome back. Choose an option:",
          replyType: "categories",
        };
      }

      case "AWAITING_ADMIN_APPROVAL": {
        const latestOrder = await prisma.order.findFirst({
          where: { customer: { whatsappNumber: from } },
          orderBy: { createdAt: "desc" },
        });

        if (latestOrder) {
          const reminderText = `Order #${latestOrder.orderNo} manager approval ka wait kar raha hai. Approval ke baad payment buttons milenge.`;
          await WhatsAppClient.sendTextMessage(from, reminderText);
          return {
            replyText: reminderText,
            replyType: "tracking",
            payload: latestOrder,
          };
        }

        await prisma.whatsAppConversation.update({
          where: { customerNumber: from },
          data: { state: "MAIN_MENU" },
        });
        await WhatsAppTemplates.sendWelcomeMenu(from);
        return {
          replyText: "Namaste! Welcome back. Choose an option:",
          replyType: "categories",
        };
      }

      case "AWAITING_PAYMENT_CONFIRM": {
        const paymentAction = this.getPaymentAction(action, cleanContent);
        if (paymentAction) {
          return this.handleApprovedPaymentChoice(from, paymentAction, session.customer?.name);
        }

        const latestOrder = await prisma.order.findFirst({
          where: { customer: { whatsappNumber: from } },
          orderBy: { createdAt: "desc" },
        });

        if (latestOrder) {
          // Save the submitted transaction UTR / Reference
          await prisma.paymentAttempt.updateMany({
            where: { orderId: latestOrder.id, status: "PENDING" },
            data: { transactionRef: cleanContent || "CONFIRMED" },
          });

          // Put the customer in the tracking state loop
          await prisma.whatsAppConversation.update({
            where: { customerNumber: from },
            data: { state: "ORDER_TRACKING" },
          });

          const confirmConfirmText = `Payment ref mil gaya: ${cleanContent || "CONFIRMED"}.\nStaff verify karke kitchen start karega.`;
          await WhatsAppClient.sendTextMessage(from, confirmConfirmText);

          return {
            replyText: confirmConfirmText,
            replyType: "tracking",
            payload: latestOrder,
          };
        }

        // Fallback
        await prisma.whatsAppConversation.update({
          where: { customerNumber: from },
          data: { state: "MAIN_MENU" },
        });
        await WhatsAppTemplates.sendWelcomeMenu(from);
        return {
          replyText: "Namaste! Welcome back. Choose an option:",
          replyType: "categories",
        };
      }

      case "ORDER_TRACKING": {
        if (action === "BACK_TO_MAIN" || cleanContent.toUpperCase() === "RESET" || cleanContent.toUpperCase() === "MENU") {
          await prisma.whatsAppConversation.update({
            where: { customerNumber: from },
            data: { state: "MAIN_MENU", activeCart: null, currentCategoryId: null },
          });
          await WhatsAppTemplates.sendWelcomeMenu(from);
          return {
            replyText: "Welcome to Mirch Masala! Choose an option:",
            replyType: "categories",
            payload: {
              options: [
                { label: "🍽️ View Menu & Order", action: "BROWSE_MENU" },
                { label: "📅 Book a Table", action: "BOOK_TABLE" },
                { label: "🛵 Track My Order", action: "TRACK_ORDER" },
              ]
            }
          };
        }

        // Refresh and return latest active order tracker
        const latestOrder = await prisma.order.findFirst({
          where: { customer: { whatsappNumber: from } },
          orderBy: { createdAt: "desc" },
          include: { customer: true },
        });

        if (latestOrder) {
          const statusText = `🛵 Live Order Status Tracker: #${latestOrder.orderNo}\nStatus: *${latestOrder.status}*\nTotal: ₹${Number(latestOrder.totalAmount).toFixed(2)}`;
          return {
            replyText: statusText,
            replyType: "tracking",
            payload: latestOrder,
          };
        }

        // Otherwise reset
        await prisma.whatsAppConversation.update({
          where: { customerNumber: from },
          data: { state: "MAIN_MENU" },
        });
        await WhatsAppTemplates.sendWelcomeMenu(from);
        return {
          replyText: "Welcome to Mirch Masala! Choose an option:",
          replyType: "categories",
          payload: {
            options: [
              { label: "🍽️ View Menu & Order", action: "BROWSE_MENU" },
              { label: "📅 Book a Table", action: "BOOK_TABLE" },
              { label: "🛵 Track My Order", action: "TRACK_ORDER" },
            ]
          }
        };
      }

      case "BOOKING_GUEST_COUNT": {
        let guests = 2;
        if (action.startsWith("BOOKING_GUESTS_")) {
          guests = parseInt(action.replace("BOOKING_GUESTS_", ""), 10);
        } else {
          const parsed = parseInt(cleanContent, 10);
          if (!isNaN(parsed) && parsed > 0) {
            guests = parsed;
          } else {
            await WhatsAppTemplates.sendBookingGuestCount(from);
            return {
              replyText: "Kripya valid guest count select ya type karein (e.g. 2):",
              replyType: "text",
            };
          }
        }

        let bookingData = { isBooking: true, guestCount: guests, dateStr: "", timeSlot: "" };
        try {
          const existing = JSON.parse(session.activeCart || "{}");
          bookingData = { ...bookingData, ...existing, guestCount: guests };
        } catch(e) {}

        await prisma.whatsAppConversation.update({
          where: { customerNumber: from },
          data: {
            state: "BOOKING_DATE",
            activeCart: JSON.stringify(bookingData),
          },
        });

        await WhatsAppTemplates.sendBookingDateOptions(from);
        return {
          replyText: "📅 Reservation ki date select karein:",
          replyType: "text",
        };
      }

      case "BOOKING_DATE": {
        let dateStr = "";
        const today = new Date();
        const formatBtnDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

        if (action === "BOOKING_DATE_TODAY") {
          dateStr = `Today, ${formatBtnDate(today)}`;
        } else if (action === "BOOKING_DATE_TOMORROW") {
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          dateStr = `Tomorrow, ${formatBtnDate(tomorrow)}`;
        } else if (action === "BOOKING_DATE_DAYAFTER") {
          const dayAfter = new Date(today);
          dayAfter.setDate(today.getDate() + 2);
          dateStr = `Day After, ${formatBtnDate(dayAfter)}`;
        } else {
          dateStr = cleanContent;
        }

        let bookingData = { isBooking: true, guestCount: 2, dateStr, timeSlot: "" };
        try {
          const existing = JSON.parse(session.activeCart || "{}");
          bookingData = { ...bookingData, ...existing, dateStr };
        } catch(e) {}

        await prisma.whatsAppConversation.update({
          where: { customerNumber: from },
          data: {
            state: "BOOKING_TIME",
            activeCart: JSON.stringify(bookingData),
          },
        });

        await WhatsAppTemplates.sendBookingTimeSlots(from);
        return {
          replyText: "⏰ Dining time slot select karein:",
          replyType: "text",
        };
      }

      case "BOOKING_TIME": {
        let timeSlot = "";
        if (action.startsWith("BOOKING_TIME_")) {
          timeSlot = action.replace("BOOKING_TIME_", "");
        } else {
          timeSlot = cleanContent;
        }

        let bookingData = { isBooking: true, guestCount: 2, dateStr: "", timeSlot };
        try {
          const existing = JSON.parse(session.activeCart || "{}");
          bookingData = { ...bookingData, ...existing, timeSlot };
        } catch(e) {}

        await prisma.whatsAppConversation.update({
          where: { customerNumber: from },
          data: {
            state: "BOOKING_CONFIRM",
            activeCart: JSON.stringify(bookingData),
          },
        });

        await WhatsAppTemplates.sendBookingConfirmation(from, {
          guestCount: bookingData.guestCount,
          dateStr: bookingData.dateStr,
          timeSlot: bookingData.timeSlot,
        });

        return {
          replyText: `📋 Table Booking Review: ${bookingData.guestCount} guests, ${bookingData.dateStr} at ${bookingData.timeSlot}.`,
          replyType: "text",
        };
      }

      case "BOOKING_CONFIRM": {
        if (action === "BOOKING_CONFIRM_NO" || cleanContent.toUpperCase().includes("CANCEL") || cleanContent.toUpperCase().includes("RESET") || cleanContent.toUpperCase() === "NO" || cleanContent === "❌") {
          await prisma.whatsAppConversation.update({
            where: { customerNumber: from },
            data: { state: "MAIN_MENU", activeCart: null },
          });
          await WhatsAppClient.sendTextMessage(from, "❌ Table booking request ko cancel kar diya gaya hai.");
          await WhatsAppTemplates.sendWelcomeMenu(from);
          return {
            replyText: "Table booking request cancelled. Choose an option:",
            replyType: "categories",
          };
        }

        // Get reservation details
        let bookingData = { isBooking: true, guestCount: 2, dateStr: "Today", timeSlot: "7:30 PM" };
        try {
          bookingData = JSON.parse(session.activeCart || "{}");
        } catch(e) {}

        let finalDate = new Date();
        const today = new Date();
        if (bookingData.dateStr.includes("Tomorrow")) {
          finalDate.setDate(today.getDate() + 1);
        } else if (bookingData.dateStr.includes("Day After")) {
          finalDate.setDate(today.getDate() + 2);
        } else if (bookingData.dateStr.includes("Today")) {
          finalDate = today;
        } else {
          try {
            const parsed = new Date(bookingData.dateStr);
            if (!isNaN(parsed.getTime())) {
              finalDate = parsed;
            }
          } catch(e) {}
        }

        const bookingsCount = await prisma.tableBooking.count();
        const bookingNo = `BK-${1001 + bookingsCount}`;

        const restaurant = await prisma.restaurant.findFirst() || await prisma.restaurant.create({ data: { name: "Mirch Masala" } });
        const restaurantId = restaurant.id;

        const booking = await prisma.tableBooking.create({
          data: {
            bookingNo,
            customerId: session.customer.id,
            restaurantId,
            guestCount: bookingData.guestCount,
            bookingDate: finalDate,
            bookingTime: bookingData.timeSlot,
            status: "PENDING",
          },
        });

        await prisma.whatsAppConversation.update({
          where: { customerNumber: from },
          data: { state: "MAIN_MENU", activeCart: null },
        });

        const confirmMsg = `⏳ *Table Booking Requested!* (Ref: *#${bookingNo}*)\n\nNamaste! Aapki table reservation request send kar di gayi hai.\n\n*Reservation Summary*:\nGuests: *${bookingData.guestCount} Guests*\nDate: *${bookingData.dateStr}*\nTime Slot: *${bookingData.timeSlot}*\nStatus: *Awaiting Manager Approval* ⏳\n\nJaise hi restaurant manager table allocate karenge, aapko yahan confirmation ticket mil jayega! 🍽️\n\nMain menu pe wapas jaane ke liye *MENU* type karein.`;
        await WhatsAppClient.sendTextMessage(from, confirmMsg);

        return {
          replyText: confirmMsg,
          replyType: "text",
        };
      }

      default: {
        await prisma.whatsAppConversation.update({
          where: { customerNumber: from },
          data: { state: "MAIN_MENU" },
        });
        await WhatsAppTemplates.sendWelcomeMenu(from);
        return {
          replyText: "Namaste! Welcome to Mirch Masala. Choose an option:",
          replyType: "categories",
          payload: {
            options: [
              { label: "🍽️ View Menu & Order", action: "BROWSE_MENU" },
              { label: "📅 Book a Table", action: "BOOK_TABLE" },
              { label: "🛵 Track My Order", action: "TRACK_ORDER" },
            ]
          }
        };
      }
    }
  }

  /**
   * Generates a fully formatted text block describing the items inside the cart
   */
  private static async getCartSummaryMessage(cart: Record<string, number>) {
    let textSummary = "*Cart Summary* 🛒\n";
    let subtotal = 0;

    const itemIds = Object.keys(cart);
    const dbItems = await prisma.menuItem.findMany({
      where: { id: { in: itemIds } },
    });

    const itemsList: Array<{ name: string; qty: number; cost: number }> = [];

    dbItems.forEach((item) => {
      const qty = cart[item.id] || 0;
      if (qty > 0) {
        const itemCost = Number(item.price) * qty;
        subtotal += itemCost;
        itemsList.push({ name: item.name, qty, cost: itemCost });
        textSummary += `• ${item.name} x${qty}: ₹${itemCost.toFixed(0)}\n`;
      }
    });

    const tax = subtotal * 0.05;
    const total = subtotal + tax;

    textSummary += `\nSubtotal ₹${subtotal.toFixed(2)} | GST ₹${tax.toFixed(2)}\n`;
    textSummary += `*Total: ₹${total.toFixed(2)}*`;

    return { textSummary, subtotal, tax, total };
  }

  private static getPaymentAction(action: string, content: string): string | null {
    if (action === "CHOOSE_PAYMENT_UPI" || action === "CHOOSE_PAYMENT_CASH" || action === "CHOOSE_PAYMENT_RAZORPAY") {
      return action;
    }

    const q = content.toUpperCase().trim();
    if (q === "PAY VIA UPI" || q === "📱 PAY VIA UPI" || q === "UPI / CARD" || q === "💳 UPI / CARD") {
      return "CHOOSE_PAYMENT_RAZORPAY";
    }
    if (q === "PAY ONLINE" || q === "💳 PAY ONLINE") {
      return "CHOOSE_PAYMENT_RAZORPAY";
    }
    if (q === "COD / CASH" || q === "💵 COD / CASH" || q === "COD" || q === "CASH") {
      return "CHOOSE_PAYMENT_CASH";
    }

    return null;
  }

  private static async handleApprovedPaymentChoice(
    from: string,
    action: string,
    customerName?: string | null
  ): Promise<BotReply> {
    const payMethod: "RAZORPAY" | "CASH" = action === "CHOOSE_PAYMENT_CASH" ? "CASH" : "RAZORPAY";

    const order = await prisma.order.findFirst({
      where: { customer: { whatsappNumber: from }, status: "ACCEPTED", paymentStatus: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    if (!order) {
      const errorMsg = "Approved pending order nahi mila. Track Order check karein ya staff se baat karein.";
      await WhatsAppClient.sendTextMessage(from, errorMsg);
      return {
        replyText: errorMsg,
        replyType: "tracking",
      };
    }

    await prisma.paymentAttempt.updateMany({
      where: { orderId: order.id, status: "PENDING" },
      data: { status: "FAILED", transactionRef: "Customer switched payment method" },
    });

    if (payMethod === "RAZORPAY") {
      const paymentLinkId = "plink_" + Math.random().toString(36).substring(2, 10).toUpperCase();
      let paymentUrl = "";
      const razorpayKeyId = envValue("RAZORPAY_KEY_ID");
      const razorpayKeySecret = envValue("RAZORPAY_KEY_SECRET");

      if (razorpayKeyId && razorpayKeySecret && !razorpayKeyId.includes("placeholder")) {
        try {
          const authBase64 = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
          const amountPaise = Math.round(Number(order.totalAmount) * 100);

          const rzpResponse = await fetch("https://api.razorpay.com/v1/payment_links", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${authBase64}`,
            },
            body: JSON.stringify({
              amount: amountPaise,
              currency: "INR",
              accept_partial: false,
              reference_id: order.id,
              description: `Payment for Order #${order.orderNo}`,
              customer: {
                name: customerName || "WhatsApp Customer",
                contact: from.startsWith("+") ? from : `+${from}`,
              },
              notify: { sms: false, email: false },
              reminder_enable: false,
            }),
          });

          if (rzpResponse.ok) {
            const rzpData = await rzpResponse.json();
            paymentUrl = rzpData.short_url;

            if (rzpData.id) {
              await prisma.paymentAttempt.create({
                data: {
                  orderId: order.id,
                  amount: order.totalAmount,
                  method: "RAZORPAY",
                  status: "PENDING",
                  transactionRef: rzpData.id,
                },
              });
            }
          } else {
            const errorText = await rzpResponse.text();
            console.error(`❌ Razorpay payment link failed (${rzpResponse.status}): ${errorText.slice(0, 500)}`);
          }
        } catch (apiErr) {
          console.error("❌ Failed to call Razorpay Payment Links API:", apiErr);
        }
      }

      const livePaymentMode = envValue("WHATSAPP_MODE") === "real";
      if (!paymentUrl && livePaymentMode) {
        const failText = "Razorpay link abhi ready nahi hua. Staff payment setup check karega.";
        await WhatsAppClient.sendTextMessage(from, failText);
        return {
          replyText: failText,
          replyType: "text",
        };
      }

      if (!paymentUrl) {
        const host = envValue("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";
        paymentUrl = `${host}/payment/razorpay-sandbox?orderId=${order.id}&orderNo=${order.orderNo}&amount=${order.totalAmount}&name=${encodeURIComponent(customerName || "WhatsApp Customer")}&linkId=${paymentLinkId}`;

        await prisma.paymentAttempt.create({
          data: {
            orderId: order.id,
            amount: order.totalAmount,
            method: "RAZORPAY",
            status: "PENDING",
            transactionRef: paymentLinkId,
          },
        });
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { notes: "Payment method selected: Razorpay" },
      });

      await prisma.whatsAppConversation.update({
        where: { customerNumber: from },
        data: { state: "AWAITING_RAZORPAY_PAYMENT" },
      });

      const payRequestText = `Pay online for #${order.orderNo}: ₹${Number(order.totalAmount).toFixed(2)}\n${paymentUrl}\nGateway open karke payment complete karein.`;
      await WhatsAppClient.sendTextMessage(from, payRequestText);

      return {
        replyText: payRequestText,
        replyType: "payment_link",
        payload: { order, paymentUrl },
      };
    }

    await OrderService.updateOrderStatus(order.id, "PREPARING" as any, "System (COD Chosen)", "COD chosen by customer. Moved directly to kitchen.");

    await prisma.whatsAppConversation.update({
      where: { customerNumber: from },
      data: { state: "ORDER_TRACKING" },
    });

    const confirmText = `COD selected ✅\nOrder #${order.orderNo} kitchen me chala gaya. Total ₹${Number(order.totalAmount).toFixed(2)}.`;
    await WhatsAppClient.sendTextMessage(from, confirmText);

    return {
      replyText: confirmText,
      replyType: "tracking",
      payload: order,
    };
  }

  /**
   * Helper to place a NEW order directly upon checkout details collection, notifying the admin queue
   */
  private static async placeOrderAndNotifyAdmin(
    from: string,
    cart: Record<string, number>,
    delType: DeliveryType,
    delAddress: string | null,
    tableNo: string | null
  ): Promise<BotReply> {
    const session = await prisma.whatsAppConversation.findUnique({
      where: { customerNumber: from },
      include: { customer: true },
    });
    
    const customerName = session?.customer?.name || "WhatsApp Customer";
    
    const itemsInput = Object.keys(cart).map((itemId) => ({
      menuItemId: itemId,
      quantity: cart[itemId],
    }));

    // Create the order in DB with status "NEW"
    const order = await OrderService.createOrder({
      whatsappNumber: from,
      customerName,
      deliveryType: delType,
      deliveryAddress: delAddress || undefined,
      tableNumber: tableNo || undefined,
      notes: "Placed via WhatsApp. Awaiting admin approval.",
      items: itemsInput,
    });

    if (!order) {
      throw new Error("Order creation failed.");
    }

    // Update conversation state to AWAITING_ADMIN_APPROVAL
    await prisma.whatsAppConversation.update({
      where: { customerNumber: from },
      data: { state: "AWAITING_ADMIN_APPROVAL", activeCart: null, currentCategoryId: null },
    });

    const confirmMsg = `Order #${order.orderNo} received ✅\nManager approve karega, phir payment buttons aayenge. Total ₹${Number(order.totalAmount).toFixed(2)}.`;
    await WhatsAppClient.sendTextMessage(from, confirmMsg);

    return {
      replyText: confirmMsg,
      replyType: "tracking",
      payload: order,
    };
  }
}
