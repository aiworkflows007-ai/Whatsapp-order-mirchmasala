import { WhatsAppClient } from "./client";

export class WhatsAppTemplates {
  /**
   * Welcome message with 3 interactive quick reply buttons
   */
  static async sendWelcomeMenu(to: string) {
    const body = `Namaste! 🌶️\nMain Chef Sanjay. Aaj kya karna hai? Button tap karein.`;
    const buttons = [
      { id: "BROWSE_MENU", title: "🍽️ View Menu" },
      { id: "BOOK_TABLE", title: "📅 Book Table" },
      { id: "TRACK_ORDER", title: "🛵 Track Order" },
    ];
    return WhatsAppClient.sendButtonsMessage(to, body, buttons);
  }

  /**
   * Lists all categories using Meta List message
   */
  static async sendCategoriesMenu(to: string, categories: Array<{ id: string; name: string; description?: string | null }>) {
    const body = `Menu khul gaya 🍽️\nCategory choose karein.`;
    
    const rows = categories.map((cat) => ({
      id: `SELECT_CAT_${cat.id}`,
      title: cat.name.substring(0, 24),
      description: cat.description ? cat.description.substring(0, 72) : undefined,
    }));

    const sections = [
      {
        title: "Mirch Masala Menu",
        rows,
      },
    ];

    return WhatsAppClient.sendListMessage(to, body, "View Categories", sections);
  }

  /**
   * Lists menu items inside a category using Meta List message
   */
  static async sendItemsMenu(
    to: string, 
    categoryName: string, 
    items: Array<{ id: string; name: string; price: any; isVegetarian: boolean; description?: string | null }>
  ) {
    const body = `*${categoryName}* 🍛\nDish tap karein, cart me add ho jayegi.`;

    const rows = items.map((item) => {
      const typeIcon = item.isVegetarian ? "🟢" : "🔴";
      return {
        id: `ADD_ITEM_${item.id}`,
        title: `${typeIcon} ${item.name}`.substring(0, 24),
        description: `₹${Number(item.price).toFixed(0)} - ${item.description || ""}`.substring(0, 72),
      };
    });

    const sections = [
      {
        title: categoryName.substring(0, 24),
        rows,
      },
    ];

    return WhatsAppClient.sendListMessage(to, body, "Add Dishes", sections);
  }

  static async sendPostAddItemOptions(to: string, message: string, categoryId: string) {
    const buttons = [
      { id: "VIEW_CART", title: "🛒 View Cart" },
      { id: `SELECT_CAT_${categoryId}`, title: "➕ Add More" },
    ];
    return WhatsAppClient.sendButtonsMessage(to, message, buttons);
  }

  /**
   * Delivery options buttons (zero-typing)
   */
  static async sendDeliveryOptions(to: string, name: string) {
    const body = `Thanks *${name}*.\nOrder kaise lena hai?`;
    const buttons = [
      { id: "CHOOSE_DELIVERY_DELIVERY", title: "🛵 Home Delivery" },
      { id: "CHOOSE_DELIVERY_PICKUP", title: "🥡 Takeaway" },
      { id: "CHOOSE_DELIVERY_DINE_IN", title: "🍽️ Dine-in Table" },
    ];
    return WhatsAppClient.sendButtonsMessage(to, body, buttons);
  }

  static async sendAddressConfirmation(to: string, address: string) {
    const body = `Address confirm karein:\n*${address}*`;
    const buttons = [
      { id: "CONFIRM_ADDRESS_YES", title: "✅ Yes, correct" },
      { id: "CONFIRM_ADDRESS_NO", title: "✏️ Change" },
    ];
    return WhatsAppClient.sendButtonsMessage(to, body, buttons);
  }

  /**
   * Payment options buttons (zero-typing)
   */
  static async sendPaymentOptions(to: string, summary: string) {
    const body = `${summary}\n\nPayment kaise karenge?`;
    const buttons = [
      { id: "CHOOSE_PAYMENT_RAZORPAY", title: "💳 UPI / Card" },
      { id: "CHOOSE_PAYMENT_CASH", title: "💵 COD / Cash" },
    ];
    return WhatsAppClient.sendButtonsMessage(to, body, buttons);
  }

  /**
   * Cart review buttons before manager approval/payment.
   */
  static async sendCartReviewOptions(to: string, summary: string) {
    const body = `${summary}\n\nOrder bhejna hai?`;
    const buttons = [
      { id: "CHECKOUT", title: "✅ Checkout" },
      { id: "BROWSE_MENU", title: "➕ Add More" },
      { id: "CLEAR_CART", title: "🧹 Clear Cart" },
    ];
    return WhatsAppClient.sendButtonsMessage(to, body, buttons);
  }

  /**
   * Table Booking Step 1: Guest Count Selection
   */
  static async sendBookingGuestCount(to: string) {
    const body = `Table booking 🍽️\nKitne guests aayenge?`;
    const buttons = [
      { id: "BOOKING_GUESTS_2", title: "1-2 Guests" },
      { id: "BOOKING_GUESTS_4", title: "3-4 Guests" },
      { id: "BOOKING_GUESTS_6", title: "5-6 Guests" },
    ];
    return WhatsAppClient.sendButtonsMessage(to, body, buttons);
  }

  /**
   * Table Booking Step 2: Date Selection
   */
  static async sendBookingDateOptions(to: string) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);

    const formatBtnDate = (d: Date) => {
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    };

    const body = `Date choose karein 📅`;
    const buttons = [
      { id: "BOOKING_DATE_TODAY", title: `Today, ${formatBtnDate(today)}` },
      { id: "BOOKING_DATE_TOMORROW", title: `Tomorrow, ${formatBtnDate(tomorrow)}` },
      { id: "BOOKING_DATE_DAYAFTER", title: `Day After, ${formatBtnDate(dayAfter)}` },
    ];
    return WhatsAppClient.sendButtonsMessage(to, body, buttons);
  }

  /**
   * Table Booking Step 3: Time Slot Selection
   */
  static async sendBookingTimeSlots(to: string) {
    const body = `Time slot choose karein ⏰`;
    const sections = [
      {
        title: "Lunch Slots",
        rows: [
          { id: "BOOKING_TIME_12:30 PM", title: "12:30 PM", description: "Afternoon lunch" },
          { id: "BOOKING_TIME_1:30 PM", title: "1:30 PM", description: "Afternoon lunch" },
        ],
      },
      {
        title: "Dinner Slots",
        rows: [
          { id: "BOOKING_TIME_7:30 PM", title: "7:30 PM", description: "Evening dinner" },
          { id: "BOOKING_TIME_8:30 PM", title: "8:30 PM", description: "Evening dinner" },
          { id: "BOOKING_TIME_9:30 PM", title: "9:30 PM", description: "Late night dinner" },
        ],
      },
    ];
    return WhatsAppClient.sendListMessage(to, body, "Select Time", sections);
  }

  /**
   * Table Booking Review & Confirmation
   */
  static async sendBookingConfirmation(to: string, bookingDetails: { guestCount: number; dateStr: string; timeSlot: string }) {
    const body = `Booking review 📋\n${bookingDetails.guestCount} guests, ${bookingDetails.dateStr}, ${bookingDetails.timeSlot}.\nConfirm karein?`;
    const buttons = [
      { id: "BOOKING_CONFIRM_YES", title: "✅ Confirm & Request" },
      { id: "BOOKING_CONFIRM_NO", title: "❌ Cancel & Reset" },
    ];
    return WhatsAppClient.sendButtonsMessage(to, body, buttons);
  }
}
