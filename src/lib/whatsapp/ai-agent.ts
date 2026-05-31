import prisma from "@/lib/prisma";

export class WhatsAppAIAgent {
  /**
   * Processes custom customer query in natural language (Hinglish)
   * Uses Gemini 1.5 Flash if GEMINI_API_KEY is present, falls back to a highly sophisticated local NLP intent matcher.
   */
  static async processQuery(query: string, customerNumber: string): Promise<string> {
    try {
      console.log(`🧠 [AI Agent] Analyzing customer query: "${query}" from ${customerNumber}`);

      // 1. Fetch entire Menu context dynamically from DB to feed the AI
      const categories = await prisma.category.findMany({
        include: { menuItems: { where: { isAvailable: true } } },
      });

      let menuContext = "Mirch Masala Restaurant Menu details:\n";
      categories.forEach((cat) => {
        menuContext += `\nCategory: ${cat.name}\n`;
        cat.menuItems.forEach((item) => {
          menuContext += `- ${item.name}: ₹${Number(item.price).toFixed(0)} (${item.isVegetarian ? "Pure Veg" : "Non-Veg"}). Description: ${item.description || "N/A"}\n`;
        });
      });

      // 2. Load restaurant settings context
      const restaurant = await prisma.restaurant.findFirst() || {
        name: "Mirch Masala",
        openingHours: "11:00 AM - 11:00 PM",
        address: "12, Spice Street, Culinary District, New Delhi, 110001",
      };

      const geminiApiKey = process.env.GEMINI_API_KEY;

      // 3. If Gemini Key is present, call Gemini 1.5 Flash
      if (geminiApiKey && !geminiApiKey.includes("placeholder")) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
          
          const systemPrompt = `You are Chef Sanjay, the warm, friendly, and expert digital host of Mirch Masala Restaurant.
Your goal is to answer the customer's query using the restaurant context below.
Speak in a highly engaging, human-like, polite Hinglish tone (mix of Hindi and English) that creates a welcoming feeling.
Use "ji" only sometimes, not in every sentence. Keep it natural, like a real helpful restaurant host.

Restaurant Settings:
- Name: ${restaurant.name}
- Opening Hours: ${restaurant.openingHours}
- Address: ${restaurant.address}

${menuContext}

Rules:
1. Answer the query accurately based ONLY on the menu and settings provided.
2. If the user asks about an item NOT on the menu, politely say Chef Sanjay will try to prepare it next time, but suggest a close alternative that is on the menu!
3. Keep your reply concise (under 80-120 words).
4. Do not include formatting like markdown lists if not needed, keep it clean.
5. End with a friendly suggest to type 'MENU' to browse foods or 'BOOK' to reserve a table.`;

          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: systemPrompt },
                  { text: `Customer Query: ${query}` }
                ]
              }]
            })
          });

          if (response.ok) {
            const data = await response.json();
            const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (replyText) {
              return replyText.trim();
            }
          } else {
            const errBody = await response.text();
            console.error("❌ Gemini API returned error response:", errBody);
          }
        } catch (apiErr) {
          console.error("❌ Failed to call Gemini API, falling back to NLP matcher:", apiErr);
        }
      }

      // 4. Fallback: Highly Sophisticated Local NLP Rule-based Intent Matcher
      return this.localNLPMatcher(query, menuContext, restaurant);
    } catch (err: any) {
      console.error("❌ AI Agent core failure:", err);
      return "Namaste! Main Chef Sanjay hoon. Aapka message mil gaya. Menu ke liye **View Menu** tap karein, ya direct request bhej dein. 👨‍🍳🍲";
    }
  }

  /**
   * Sophisticated Local NLP Rule-based Intent Matcher for zero-latency offline fallbacks
   */
  private static localNLPMatcher(query: string, menuContext: string, restaurant: any): string {
    const q = query.toLowerCase();

    // 1. Spiciness level queries
    if (q.includes("spicy") || q.includes("teekha") || q.includes("mirch") || q.includes("chilli")) {
      return `Bilkul 🌶️ Spice level adjust ho sakta hai. Order ke baad note bhej dena: less spicy ya extra spicy.`;
    }

    // 2. Veg / Vegetarian queries
    if (q.includes("veg") || q.includes("shakahari") || q.includes("paneer") || q.includes("vegetarian")) {
      return `Veg ke liye Paneer Tikka, Dal Makhani aur Garlic Naan best hain 🟢 View Menu tap karein.`;
    }

    // 3. Discount / Coupon queries
    if (q.includes("discount") || q.includes("offer") || q.includes("coupon") || q.includes("sasta") || q.includes("off")) {
      return `Aaj koi auto-coupon nahi dikh raha 🎁 Staff special offer ho to admin se confirm karega.`;
    }

    // 4. Timing / Operating Hours queries
    if (q.includes("time") || q.includes("timing") || q.includes("hour") || q.includes("open") || q.includes("khula") || q.includes("close")) {
      return `Mirch Masala timing: *${restaurant.openingHours}* ⏰ Order ya table booking ke liye buttons tap karein.`;
    }

    // 5. Address / Location / Directions queries
    if (q.includes("address") || q.includes("location") || q.includes("kahan") || q.includes("directions") || q.includes("map")) {
      return `Location 📍 *${restaurant.address}*`;
    }

    // 6. Non-veg queries
    if (q.includes("non-veg") || q.includes("nonveg") || q.includes("chicken") || q.includes("egg") || q.includes("fish") || q.includes("mutton")) {
      return `Non-veg specials fresh bante hain 🔴 Butter Chicken aur Tikka popular hain. View Menu tap karein.`;
    }

    // 7. General Greetings
    if (q.includes("hello") || q.includes("hi") || q.includes("hey") || q.includes("namaste") || q.includes("sup")) {
      return `Namaste 🌶️ Main Chef Sanjay. Order, table booking ya tracking ke liye button tap karein.`;
    }

    // Default Fallback
    return `Chef Sanjay yahan hai 👨‍🍳 Menu, table ya tracking ke liye button tap karein. Special request ho to short me bhej dijiye.`;
  }
}
