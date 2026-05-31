import prisma from "@/lib/prisma";
import { AIProvider } from "./ai-provider";
import { CHEF_SANJAY_SYSTEM_PROMPT } from "./system-prompt";
import { RestaurantTools } from "./tools";
import { CustomerSessionService } from "../restaurant/customer-session";
import { WhatsAppAIAgent } from "../whatsapp/ai-agent";
import { SafetyGuard } from "./safety-guard";
import { FallbackAgent } from "./fallback-agent";

export interface AIResponse {
  reply: string;
  actions: string[];
  session: any;
  handoff?: boolean;
}

export class AIRestaurantAgent {
  /**
   * Main entry point to process a customer message via Chef Sanjay AI
   */
  static async handleRestaurantAIMessage(options: {
    phone: string;
    profileName?: string;
    message: string;
    messageId?: string;
  }): Promise<AIResponse> {
    const { phone, profileName, message } = options;

    console.log(`🤖 [Chef Sanjay AI] Coordinating input for ${phone}: "${message}"`);

    // 1. Check if AI is disabled in environment
    const aiEnabled = process.env.AI_ENABLED !== "false";
    if (!aiEnabled) {
      console.log("🔌 [Chef Sanjay AI] AI is disabled in env. Using rule-based fallback.");
      const fallbackReply = await WhatsAppAIAgent.processQuery(message, phone);
      const session = await CustomerSessionService.getSession(phone, profileName);
      return {
        reply: fallbackReply,
        actions: [],
        session,
      };
    }

    // 2. Fetch Customer Session and Menu context
    const session = await CustomerSessionService.getSession(phone, profileName);
    const { textContext: menuContext } = await RestaurantTools.getMenu();
    const cartDetails = await RestaurantTools.getCart(phone);

    // 3. Compile session context for system prompt
    const sessionContext = `
Customer Profile:
- Phone: ${phone}
- Profile Name: ${profileName || "Guest"}
- Customer Name: ${session.customerName || "Not Provided"}
- Active Conversation State: ${session.state}
- Saved Address: ${session.address || "Not Provided"}
- Active Cart: ${JSON.stringify(cartDetails.items)}
- Cart Subtotal: ₹${cartDetails.subtotal}
- Cart Grand Total: ₹${cartDetails.total}
`;

    // 4. Generate AI Reply via provider
    const result = await AIProvider.generateAIReply({
      systemPrompt: CHEF_SANJAY_SYSTEM_PROMPT,
      userMessage: message,
      context: `${menuContext}\n\n${sessionContext}`,
    });

    let parsedReply = "";
    let parsedActions: any[] = [];
    let isHandoff = false;
    const executedActionsList: string[] = [];

    if (result.error || !result.text) {
      // 5. Rule-based Fallback if AI fails or key is missing
      console.warn("⚠️ [Chef Sanjay AI] AI Generation failed or is offline. Using local Fallback Agent.");
      const localResult = await FallbackAgent.parseQuery(message, phone);
      if (localResult) {
        parsedReply = localResult.reply;
        parsedActions = localResult.actions;
      } else {
        const fallbackReply = await WhatsAppAIAgent.processQuery(message, phone);
        parsedReply = fallbackReply;
      }
    } else {
      // 6. Parse JSON output safely
      try {
        const cleanedJson = this.sanitizeJsonString(result.text);
        const data = JSON.parse(cleanedJson);
        parsedReply = data.reply || "";
        parsedActions = data.actions || [];
      } catch (err) {
        console.error("❌ [Chef Sanjay AI] Failed to parse AI JSON response. Text was:", result.text);
        console.error("Error details:", err);
        
        // Try local fallback agent first before generic text
        const localResult = await FallbackAgent.parseQuery(message, phone);
        if (localResult) {
          parsedReply = localResult.reply;
          parsedActions = localResult.actions;
        } else {
          const fallbackReply = await WhatsAppAIAgent.processQuery(message, phone);
          parsedReply = fallbackReply;
        }
      }
    }

    // 7. Execute Actions sequentially in the database
    if (parsedActions && parsedActions.length > 0) {
      console.log(`🧠 [Chef Sanjay AI] Executing ${parsedActions.length} actions for ${phone}...`);
      
      for (const act of parsedActions) {
        try {
          const params = act.params || {};
          
          switch (act.type) {
            case "ADD_TO_CART": {
              const itemToResolve = params.itemName || params.itemId || "";
              const qty = params.quantity || 1;
              const res = await RestaurantTools.addItemToCart(phone, itemToResolve, qty, params.notes);
              if (res.success) {
                executedActionsList.push(`Added ${qty}x ${res.item?.name} to cart.`);
              } else {
                console.warn(`⚠️ [Chef Sanjay AI] Failed to add item: ${res.error}`);
              }
              break;
            }

            case "REMOVE_FROM_CART": {
              const itemToResolve = params.itemName || params.itemId || "";
              const res = await RestaurantTools.removeItemFromCart(phone, itemToResolve);
              if (res.success) {
                executedActionsList.push(`Removed ${res.removedItem} from cart.`);
              }
              break;
            }

            case "CLEAR_CART": {
              await RestaurantTools.clearCart(phone);
              executedActionsList.push("Cleared cart.");
              break;
            }

            case "SET_CUSTOMER_INFO": {
              if (params.name) {
                await RestaurantTools.saveCustomerName(phone, params.name);
                executedActionsList.push(`Saved name: ${params.name}`);
              }
              if (params.address) {
                await RestaurantTools.saveAddress(phone, params.address);
                executedActionsList.push(`Saved address: ${params.address}`);
              }
              if (params.tableNo) {
                // Table numbers are recorded as notes/deliveryType variables
                await RestaurantTools.setSessionState(phone, "AWAITING_PAYMENT");
                executedActionsList.push(`Saved table number: ${params.tableNo}`);
              }
              break;
            }

            case "SET_ORDER_TYPE": {
              if (params.orderType) {
                executedActionsList.push(`Order Type set to: ${params.orderType}`);
                if (params.orderType === "DELIVERY") {
                  await RestaurantTools.setSessionState(phone, "AWAITING_ADDRESS");
                } else if (params.orderType === "PICKUP") {
                  await RestaurantTools.setSessionState(phone, "AWAITING_PAYMENT");
                } else if (params.orderType === "DINE_IN") {
                  await RestaurantTools.setSessionState(phone, "AWAITING_TABLE_NO");
                }
              }
              break;
            }

            case "PLACE_ORDER": {
              const delType = params.deliveryType || "DELIVERY";
              const res = await RestaurantTools.createPendingOrder(phone, delType as any);
              if (res.success) {
                executedActionsList.push(`Placed PENDING order: #${res.orderNo}`);
              } else {
                console.error("❌ [Chef Sanjay AI] Failed to place pending order:", res.error);
              }
              break;
            }

            case "BOOK_TABLE": {
              if (params.confirm) {
                const res = await RestaurantTools.createTableBookingRequest(phone, {
                  guestCount: params.guestCount,
                  dateStr: params.dateStr,
                  timeSlot: params.timeSlot,
                });
                if (res.success) {
                  executedActionsList.push(`Created Table Reservation: #${res.bookingNo}`);
                }
              } else {
                // Transition to Table booking states to review
                await RestaurantTools.setSessionState(phone, "BOOKING_CONFIRM");
                executedActionsList.push("Staged Table Reservation details.");
              }
              break;
            }

            case "REQUEST_HANDOFF": {
              isHandoff = true;
              executedActionsList.push(`Requested Human Handoff. Reason: ${params.reason || "General Help"}`);
              break;
            }

            default:
              console.warn(`⚠️ [Chef Sanjay AI] Unsupported action type: ${act.type}`);
          }
        } catch (actErr) {
          console.error(`❌ [Chef Sanjay AI] Error executing action ${act.type}:`, actErr);
        }
      }
    }

    // 8. Apply Safety Guard Sanitizer to outgoing reply text
    const cleanReply = SafetyGuard.sanitizeReply(parsedReply);

    // 9. Reload updated customer session details
    const updatedSession = await CustomerSessionService.getSession(phone, profileName);

    return {
      reply: cleanReply,
      actions: executedActionsList,
      session: updatedSession,
      handoff: isHandoff,
    };
  }

  /**
   * Helper to clean up any messy markdown or formatting wrappers around AI JSON replies
   */
  private static sanitizeJsonString(text: string): string {
    let clean = text.trim();
    
    // Remove markdown code fences if present (e.g. ```json ... ``` or ``` ...)
    if (clean.startsWith("```")) {
      const firstLineEnd = clean.indexOf("\n");
      const lastFence = clean.lastIndexOf("```");
      if (firstLineEnd !== -1 && lastFence !== -1) {
        clean = clean.substring(firstLineEnd + 1, lastFence).trim();
      }
    }

    return clean;
  }
}
