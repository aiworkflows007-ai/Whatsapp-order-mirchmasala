/**
 * AI Output Safety Guard - Chef Sanjay AI
 * Ensures compliance with critical business safety rules before sending replies to customers.
 */

export class SafetyGuard {
  private static SAFE_FALLBACK = 
    "Maaf kijiye, details check karne me thoda samay lag raha hai. 👨‍🍳 Main restaurant staff ko direct connect kar raha hoon taaki aapki turant help ho sake. Kripya thoda wait karein. 🙏";

  /**
   * Sanitizes and verifies the AI conversational output.
   * If any violations are found, replaces it with a clean fallback message.
   */
  static sanitizeReply(replyText: string): string {
    if (!replyText || replyText.trim() === "") {
      return this.SAFE_FALLBACK;
    }

    const lower = replyText.toLowerCase();

    // Rule 1: No fake confirmations (AI must not declare order is confirmed/prepared)
    if (
      (lower.includes("order confirmed") || lower.includes("order accept ho gaya") || lower.includes("order confirm ho gaya")) &&
      !lower.includes("pending") && 
      !lower.includes("review") &&
      !lower.includes("wait")
    ) {
      console.warn("⚠️ [Safety Guard] Blocked AI response claiming final order confirmation.");
      return replyText.replace(/confirm/gi, "pending check") + " (Note: Order restaurant manager ke review ke baad confirm hoga. ⏳)";
    }

    // Rule 2: No fake payment statuses
    if (lower.includes("payment received") || lower.includes("payment confirm ho chuki hai") || lower.includes("payment complete ho chuka hai")) {
      console.warn("⚠️ [Safety Guard] Blocked AI response claiming payment received.");
      return "Namaste! Aapka order place ho gaya hai. Jaise hi manager payment check karke approve karenge, kitchen staff order prepare karna shuru kar dega. Dhanyawad! 😊";
    }

    // Rule 3: No internal system, API, or database mentions
    if (
      lower.includes("database") ||
      lower.includes("api key") ||
      lower.includes("schema") ||
      lower.includes("backend") ||
      lower.includes("sql") ||
      lower.includes("json") ||
      lower.includes("prisma") ||
      lower.includes("system prompt") ||
      lower.includes("assistant identity")
    ) {
      console.warn("⚠️ [Safety Guard] Blocked AI response exposing internal technical terms.");
      return "Maaf kijiye, humare kitchen me authentic traditional style me food banaya jata hai! 🍲 Aap menu dekhne ke liye 'MENU' type kar sakte hain.";
    }

    // Rule 4: Prevent excessively long outputs (WhatsApp message character cap for readability)
    if (replyText.length > 800) {
      console.warn("⚠️ [Safety Guard] Truncated AI response exceeding length boundaries.");
      return replyText.substring(0, 750) + "...\n\n👇 Aage ki details ke liye 'MENU' type karein.";
    }

    return replyText;
  }
}
