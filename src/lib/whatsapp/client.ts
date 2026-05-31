import prisma from "@/lib/prisma";
import { envValue } from "@/lib/env-values";

export class WhatsAppClient {
  private static token = envValue("WHATSAPP_ACCESS_TOKEN");
  private static phoneId = envValue("WHATSAPP_PHONE_NUMBER_ID");
  private static mode = envValue("WHATSAPP_MODE") || "demo";

  /**
   * Helper to write outbound message to WhatsApp logs in DB
   */
  private static async logOutboundMessage(to: string, messageType: string, content: string, payload: any) {
    try {
      await prisma.whatsAppMessageLog.create({
        data: {
          customerNumber: to,
          direction: "OUTBOUND",
          messageType,
          content,
          rawPayload: JSON.stringify(payload),
        },
      });
    } catch (err) {
      console.error("❌ Failed to log outbound WhatsApp message:", err);
    }
  }

  /**
   * Send a standard text message
   */
  static async sendTextMessage(to: string, text: string) {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text },
    };

    if (process.env.NODE_ENV !== "production") {
      console.log(`📡 [WhatsApp Client - OUTBOUND TEXT] to ${to}: ${text}`);
    } else {
      console.log(`📡 [WhatsApp Client - OUTBOUND TEXT] to ${to.slice(-4)} (${text.length} chars)`);
    }
    await this.logOutboundMessage(to, "text", text, payload);

    if (this.mode === "real") {
      return this.sendToMetaAPI(payload);
    }
    return { success: true, message_id: `mock-msg-${Math.random().toString(36).substr(2, 9)}` };
  }

  /**
   * Send interactive Quick Reply buttons (up to 3 buttons)
   */
  static async sendButtonsMessage(to: string, bodyText: string, buttons: Array<{ id: string; title: string }>) {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText },
        action: {
          buttons: buttons.slice(0, 3).map((btn) => ({
            type: "reply",
            reply: {
              id: btn.id,
              title: btn.title.substring(0, 20), // Meta limit is 20 chars
            },
          })),
        },
      },
    };

    const contentSummary = `${bodyText} | Buttons: [${buttons.map(b => b.title).join(", ")}]`;
    if (process.env.NODE_ENV !== "production") {
      console.log(`📡 [WhatsApp Client - OUTBOUND BUTTONS] to ${to}: ${contentSummary}`);
    } else {
      console.log(`📡 [WhatsApp Client - OUTBOUND BUTTONS] to ${to.slice(-4)}`);
    }
    await this.logOutboundMessage(to, "button_reply", contentSummary, payload);

    if (this.mode === "real") {
      return this.sendToMetaAPI(payload);
    }
    return { success: true, message_id: `mock-msg-${Math.random().toString(36).substr(2, 9)}` };
  }

  /**
   * Send interactive List selection menu (up to 10 rows)
   */
  static async sendListMessage(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>
  ) {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: bodyText },
        action: {
          button: buttonText.substring(0, 20), // Meta limit is 20 chars
          sections: sections.map((sec) => ({
            title: sec.title.substring(0, 24), // Meta limit is 24 chars
            rows: sec.rows.slice(0, 10).map((row) => ({
              id: row.id,
              title: row.title.substring(0, 24), // Meta limit is 24 chars
              description: row.description ? row.description.substring(0, 72) : undefined, // Meta limit is 72 chars
            })),
          })),
        },
      },
    };

    const contentSummary = `${bodyText} | List Action: ${buttonText}`;
    if (process.env.NODE_ENV !== "production") {
      console.log(`📡 [WhatsApp Client - OUTBOUND LIST] to ${to}: ${contentSummary}`);
    } else {
      console.log(`📡 [WhatsApp Client - OUTBOUND LIST] to ${to.slice(-4)}`);
    }
    await this.logOutboundMessage(to, "list_reply", contentSummary, payload);

    if (this.mode === "real") {
      return this.sendToMetaAPI(payload);
    }
    return { success: true, message_id: `mock-msg-${Math.random().toString(36).substr(2, 9)}` };
  }

  /**
   * Internal routine to execute raw Meta Graph API post request
   */
  private static async sendToMetaAPI(payload: any) {
    if (!this.token || !this.phoneId) {
      console.warn("⚠️ Meta credentials missing in environment. Outbound delivery failed. Logging payload instead.");
      return { error: "Meta credentials missing" };
    }

    const url = `https://graph.facebook.com/v19.0/${this.phoneId}/messages`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("❌ Meta WhatsApp Cloud API error response:", data);
        return { error: data };
      }

      return { success: true, data };
    } catch (err: any) {
      console.error("❌ Meta API execution failed:", err);
      return { error: err.message };
    }
  }
}
