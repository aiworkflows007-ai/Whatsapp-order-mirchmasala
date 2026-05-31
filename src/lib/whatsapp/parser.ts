export interface IncomingMessage {
  from: string;          // Customer phone number or session ID
  type: "text" | "interactive";
  content: string;       // User text or clicked button label
  actionPayload?: string; // Action key (e.g. "SELECT_CAT_123" or "CHOOSE_PAYMENT_CASH")
  profileName?: string;  // Customer profile name from Meta WhatsApp
}

export class WhatsAppParser {
  /**
   * Normalizes live Meta WhatsApp Webhook payloads
   */
  static parseWebhook(body: any): IncomingMessage | null {
    try {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0]?.value;
      const message = change?.messages?.[0];
      const contact = change?.contacts?.[0];

      if (!message) return null;

      const from = message.from; // Phone number
      const profileName = contact?.profile?.name || "";

      // 1. Text Message
      if (message.type === "text") {
        return {
          from,
          type: "text",
          content: message.text?.body || "",
          profileName,
        };
      }

      // 2. Interactive Interactive Button / Quick Reply Message
      if (message.type === "interactive") {
        const interactive = message.interactive;

        if (interactive.type === "button_reply") {
          return {
            from,
            type: "interactive",
            content: interactive.button_reply?.title || "",
            actionPayload: interactive.button_reply?.id || "",
            profileName,
          };
        }

        if (interactive.type === "list_reply") {
          return {
            from,
            type: "interactive",
            content: interactive.list_reply?.title || "",
            actionPayload: interactive.list_reply?.id || "",
            profileName,
          };
        }
      }

      // Fallback for button quick replies sent via template
      if (message.type === "button") {
        return {
          from,
          type: "interactive",
          content: message.button?.text || "",
          actionPayload: message.button?.payload || "",
          profileName,
        };
      }

      return null;
    } catch (err) {
      console.error("❌ Error parsing Meta WhatsApp webhook payload:", err);
      return null;
    }
  }

  /**
   * Normalizes Web Simulator messages
   */
  static parseSimulator(body: any): IncomingMessage | null {
    try {
      const { from, type, content, actionPayload, profileName } = body;
      
      if (!from || !content) return null;

      return {
        from: String(from),
        type: type === "interactive" ? "interactive" : "text",
        content: String(content),
        actionPayload: actionPayload ? String(actionPayload) : undefined,
        profileName: profileName ? String(profileName) : undefined,
      };
    } catch (err) {
      console.error("❌ Error parsing Simulator payload:", err);
      return null;
    }
  }
}
