/**
 * AI Provider Wrapper - Mirch Masala Restaurant Ordering System
 * Handles secure server-side connections to the Gemini REST API.
 */

export interface AIReplyOptions {
  systemPrompt: string;
  userMessage: string;
  context?: string;
}

export interface AIReplyResult {
  text: string;
  raw?: any;
  error?: string;
}

export class AIProvider {
  /**
   * Generates a conversational response using the configured AI provider (defaults to Gemini)
   */
  static async generateAIReply(options: AIReplyOptions): Promise<AIReplyResult> {
    const provider = process.env.AI_PROVIDER || "gemini";
    const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || "";
    const model = process.env.AI_MODEL || "gemini-2.5-flash-lite";

    // 1. Validation Guard - missing key or default placeholder
    if (!apiKey || apiKey.trim() === "" || apiKey.includes("placeholder") || apiKey.includes("PASTE_AI_KEY_HERE")) {
      console.warn("⚠️ [AI Provider] Missing or placeholder AI_API_KEY. Falling back to rule-based matcher.");
      return {
        text: "",
        error: "Missing API Key",
      };
    }

    try {
      if (provider.toLowerCase() === "gemini") {
        // Use Gemini API Endpoint via standard HTTP POST
        // Support models like gemini-2.5-flash-lite, gemini-1.5-flash, etc.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const fullPrompt = `${options.systemPrompt}\n\n${options.context ? `Additional Context:\n${options.context}\n\n` : ""}User Input: ${options.userMessage}`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: fullPrompt },
                ],
              },
            ],
            generationConfig: {
              // Ask for JSON output to let Chef Sanjay command the system cleanly
              responseMimeType: "application/json",
              temperature: 0.2, // Low temperature for higher structural accuracy
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ [AI Provider] Gemini API request failed: ${response.status} - ${errorText}`);
          return {
            text: "",
            error: `API returned status ${response.status}`,
          };
        }

        const data = await response.json();
        const textReply = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textReply) {
          console.error("❌ [AI Provider] Empty response received from Gemini API:", JSON.stringify(data));
          return {
            text: "",
            error: "Empty reply from AI",
          };
        }

        return {
          text: textReply.trim(),
          raw: data,
        };
      }

      // Future expansion: Support "openai" or "claude" here
      return {
        text: "",
        error: `Unsupported provider: ${provider}`,
      };
    } catch (error: any) {
      console.error("❌ [AI Provider] Unexpected error calling AI endpoint:", error);
      return {
        text: "",
        error: error.message || "Failed to generate AI response",
      };
    }
  }
}
