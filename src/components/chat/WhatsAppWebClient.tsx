"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChatMenuCard, MenuItemData } from "./ChatMenuCard";
import { Send, CheckCheck, Phone, Video, Search, MoreVertical, Paperclip, Smile, Mic, ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";

interface CategoryWithItems {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  menuItems: MenuItemData[];
}

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  time: string;
  type: "text" | "categories" | "menu" | "cart" | "checkout_details" | "order_success" | "tracking" | "payment_link" | "payment_qr";
  content: string;
  payload?: any; // Stores categories array, items list, cart totals, or active order tracking object
}

// Conversation states for the simulator
type BotState = 
  | "START"
  | "AWAITING_MAIN_MENU"
  | "VIEW_CATEGORIES"
  | "CART_REVIEW"
  | "AWAITING_NAME"
  | "AWAITING_DELIVERY_TYPE"
  | "AWAITING_ADDRESS"
  | "AWAITING_TABLE_NO"
  | "AWAITING_PAYMENT"
  | "AWAITING_RAZORPAY_PAYMENT"
  | "AWAITING_ADMIN_APPROVAL"
  | "ORDER_CONFIRMED";

export const WhatsAppWebClient: React.FC = () => {
  // Database menu states
  const [categories, setCategories] = useState<CategoryWithItems[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithItems | null>(null);
  
  // Chat messaging states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // Bot conversational state
  const [botState, setBotState] = useState<BotState>("START");
  
  // Active Cart State
  const [cart, setCart] = useState<Record<string, number>>({}); // itemId -> qty
  
  // Collected checkout info
  const [checkoutInfo, setCheckoutInfo] = useState({
    name: "",
    deliveryType: "" as "DELIVERY" | "PICKUP" | "DINE_IN" | "",
    address: "",
    tableNo: "",
  });

  // Confirmed order references
  const [activeOrder, setActiveOrder] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to the bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // 1. Fetch menu categories and items from our API
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch("/api/menu");
        const data = await res.json();
        if (data.success) {
          setCategories(data.categories);
        }
      } catch (err) {
        console.error("Failed to load menu", err);
      }
    };

    fetchMenu();

    // Initialize with Welcome Message
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    
    setMessages([
      {
        id: "welcome-1",
        sender: "bot",
        time: timeStr,
        type: "text",
        content: "Namaste! Welcome to *Mirch Masala Restaurant* 🌶️🍲\n\nI am your digital host. Main aapki kya sahayata kar sakta hoon?\n\nKripya niche click karke option select karein:",
      },
      {
        id: "welcome-options",
        sender: "bot",
        time: timeStr,
        type: "categories",
        content: "Menu Options",
        payload: {
          options: [
            { label: "🍽️ View Menu & Order", action: "BROWSE_MENU" },
            { label: "📅 Book a Table", action: "BOOK_TABLE" },
            { label: "🛵 Track My Order", action: "TRACK_ORDER" },
          ]
        }
      }
    ]);
    setBotState("AWAITING_MAIN_MENU");
  }, []);

  // Update Item Quantity in Cart
  const handleUpdateCartQuantity = (itemId: string, change: number) => {
    setCart((prev) => {
      const updated = { ...prev };
      const currentQty = updated[itemId] || 0;
      const newQty = currentQty + change;
      
      if (newQty <= 0) {
        delete updated[itemId];
      } else {
        updated[itemId] = newQty;
      }
      return updated;
    });

    if (change > 0) {
      postSimulatorMessage("Add item to cart", `ADD_ITEM_${itemId}`);
    }
  };

  // Helper to get active cart items with details
  const getCartItemsWithDetails = () => {
    const itemsList: Array<{ item: MenuItemData; quantity: number }> = [];
    let subtotal = 0;

    categories.forEach((cat) => {
      cat.menuItems.forEach((menuItem) => {
        const qty = cart[menuItem.id];
        if (qty && qty > 0) {
          itemsList.push({ item: menuItem, quantity: qty });
          subtotal += Number(menuItem.price) * qty;
        }
      });
    });

    const tax = subtotal * 0.05; // 5% GST
    const total = subtotal + tax;

    return { itemsList, subtotal, tax, total };
  };

  // Triggers bot typing state and sends reply after a delay
  const triggerBotReply = (replyContent: string, replyType: ChatMessage["type"] = "text", payload?: any, delay = 600) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "bot",
          time: timeStr,
          type: replyType,
          content: replyContent,
          payload
        }
      ]);
    }, delay);
  };

  // Core Unified Simulator Poster
  const postSimulatorMessage = async (text: string, actionPayload?: string) => {
    setIsTyping(true);
    
    try {
      const res = await fetch("/api/whatsapp/demo-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "919876543210", // Constant simulator number
          type: actionPayload ? "interactive" : "text",
          content: text,
          actionPayload,
          profileName: "Ashok Kumar",
        }),
      });

      const data = await res.json();
      setIsTyping(false);

      if (data.success) {
        setBotState(data.nextState);
        
        // If order was confirmed, clear local cart and save activeOrder!
        if (data.replyType === "tracking" && data.payload) {
          setActiveOrder(data.payload);
          setCart({});
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: "bot",
            time: timeStr,
            type: data.replyType,
            content: data.replyText,
            payload: data.payload,
          },
        ]);
      }
    } catch (err) {
      setIsTyping(false);
      console.error("❌ Simulator post failed:", err);
    }
  };

  // Process User typed message inputs
  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append User message bubble
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: "user",
        time: timeStr,
        type: "text",
        content: text,
      }
    ]);
    
    setInputValue("");

    postSimulatorMessage(text);
  };

  // Handle sidebar/quick-reply click events
  const handleMainOption = (action: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    let labelText = "Option Selected";
    if (action === "BROWSE_MENU") labelText = "🍽️ View Menu & Order";
    if (action === "BOOK_TABLE") labelText = "📅 Book a Table";
    if (action === "TRACK_ORDER") labelText = "🛵 Track My Order";

    setMessages((prev) => [
      ...prev,
      { id: Math.random().toString(), sender: "user", time: timeStr, type: "text", content: labelText }
    ]);

    postSimulatorMessage(labelText, action);
  };

  // Handle category selections or custom card buttons clicks
  const handleCustomAction = (action: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    let labelText = "Clicked Action";
    
    if (action === "BACK_TO_MAIN") {
      labelText = "🏠 Main Menu";
      setCart({});
    } else if (action.startsWith("SELECT_CAT_")) {
      const catId = action.replace("SELECT_CAT_", "");
      const cat = categories.find((c) => c.id === catId);
      labelText = cat ? `📁 ${cat.name}` : "📁 Select Category";
    } else if (action === "CHOOSE_DELIVERY_DELIVERY") {
      labelText = "🛵 Home Delivery";
    } else if (action === "CHOOSE_DELIVERY_PICKUP") {
      labelText = "🥡 Self Takeaway / Pickup";
    } else if (action === "CHOOSE_DELIVERY_DINE_IN") {
      labelText = "🍽️ Dine-in (At Table)";
    } else if (action === "CHOOSE_PAYMENT_UPI") {
      labelText = "📱 Pay via UPI QR";
    } else if (action === "CHOOSE_PAYMENT_RAZORPAY") {
      labelText = "💳 Pay Online (Cards/UPI)";
    } else if (action === "CHOOSE_PAYMENT_CASH") {
      labelText = "💵 Pay via Cash / COD";
    } else if (action === "CHECKOUT") {
      labelText = "📋 Checkout Details";
    } else if (action === "VIEW_CART") {
      labelText = "🛒 View Basket";
    }

    setMessages((prev) => [
      ...prev,
      { id: Math.random().toString(), sender: "user", time: timeStr, type: "text", content: labelText }
    ]);

    postSimulatorMessage(labelText, action);
  };

  // Render Category quick selections or Cart button inside Chat
  const renderInteractivePayload = (msg: ChatMessage) => {
    if (msg.type === "categories" && msg.payload?.options) {
      return (
        <div className="flex flex-wrap gap-2 mt-2">
          {msg.payload.options.map((opt: any, index: number) => (
            <button
              key={index}
              onClick={() => {
                if (
                  opt.action.startsWith("SELECT_CAT_") || 
                  opt.action === "BACK_TO_MAIN" ||
                  opt.action.startsWith("CHOOSE_DELIVERY_") ||
                  opt.action.startsWith("CHOOSE_PAYMENT_")
                ) {
                  handleCustomAction(opt.action);
                } else {
                  handleMainOption(opt.action);
                }
              }}
              className="px-4 py-2 bg-[#202c33] hover:bg-[#182229] border border-[#2f3b43] text-gray-200 hover:text-white rounded-full text-xs font-medium transition-all shadow-sm hover:scale-105 active:scale-95"
            >
              {opt.label}
            </button>
          ))}
        </div>
      );
    }

    if (msg.type === "menu" && msg.payload?.categoryId) {
      const cat = categories.find((c) => c.id === msg.payload.categoryId);
      if (!cat) return null;

      return (
        <div className="mt-2 w-full">
          <ChatMenuCard
            items={cat.menuItems}
            cartQuantities={cart}
            onUpdateQuantity={handleUpdateCartQuantity}
          />
          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              onClick={() => {
                const { itemsList } = getCartItemsWithDetails();
                if (itemsList.length === 0) {
                  alert("Aapka cart khali hai. Please dishes add karein!");
                  return;
                }
                handleCustomAction("VIEW_CART");
              }}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-full hover-scale active:scale-95 shadow-md flex items-center gap-1 transition-all"
            >
              🛒 View Cart & Place Order
            </button>
            <button
              onClick={() => {
                postSimulatorMessage("Select Category", "BROWSE_MENU");
              }}
              className="px-4 py-2 bg-[#202c33] hover:bg-[#182229] border border-[#2f3b43] text-gray-300 text-xs rounded-full transition-all"
            >
              📂 Select Other Category
            </button>
          </div>
        </div>
      );
    }

    if (msg.type === "cart") {
      const { itemsList, subtotal, tax, total } = getCartItemsWithDetails();

      return (
        <div className="mt-2 p-3 rounded-2xl glass border border-border max-w-[280px] text-xs shadow-md">
          <h4 className="font-bold border-b border-border pb-1.5 text-primary text-[13px] tracking-wide uppercase flex items-center justify-between">
            <span>Your Basket 🛒</span>
            <span className="text-[10px] text-muted normal-case font-normal">Mirch Masala</span>
          </h4>
          <div className="mt-2 space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
            {itemsList.map((entry) => (
              <div key={entry.item.id} className="flex justify-between items-center gap-2">
                <span className="text-gray-200 line-clamp-1 font-medium flex-1">
                  {entry.item.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted">x{entry.quantity}</span>
                  <span className="font-semibold text-gray-100">
                    ₹{(Number(entry.item.price) * entry.quantity).toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border mt-3 pt-2 space-y-1 text-muted text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>5% GST Tax:</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-200 text-xs pt-1 border-t border-border/40">
              <span>Grand Total:</span>
              <span className="text-primary">₹{total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={() => handleCustomAction("CHECKOUT")}
            className="w-full mt-3 py-1.5 bg-accent hover:bg-emerald-600 text-white font-bold rounded-lg text-center shadow-md hover-scale active:scale-95 transition-all text-xs"
          >
            📋 Checkout
          </button>
        </div>
      );
    }

    if (msg.type === "payment_qr" && msg.payload) {
      const order = msg.payload;
      const amount = Number(order.totalAmount).toFixed(2);
      const orderNo = order.orderNo;
      const orderId = order.id;

      // Construct dynamic UPI Deep Link according to NPCI specs
      const upiId = "mirchmasala@okaxis";
      const merchantName = "Mirch Masala Restaurant";
      const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&tr=${orderId}&tn=${encodeURIComponent(`Order ${orderNo}`)}`;
      
      // Use premium free QR generator API
      const qrCodeImg = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(upiUrl)}`;

      return (
        <div className="mt-2 p-4 rounded-2xl glass border border-border max-w-[280px] text-xs shadow-lg flex flex-col items-center gap-3">
          <h4 className="font-bold text-primary text-[13px] border-b border-border pb-1.5 w-full text-center uppercase tracking-wide">
            📱 UPI QR Payment
          </h4>
          
          <div className="text-center space-y-1 w-full text-gray-300">
            <div className="flex justify-between text-[11px]">
              <span>Order Ref:</span>
              <span className="font-bold text-gray-100">#{orderNo}</span>
            </div>
            <div className="flex justify-between text-[11px] border-b border-border/40 pb-1.5 mb-1.5">
              <span>Amount Due:</span>
              <span className="font-black text-accent text-sm">₹{amount}</span>
            </div>
            <p className="text-[10px] text-muted italic leading-relaxed">
              Scan QR code using any UPI App (GPay, PhonePe, Paytm, BHIM) to complete payment.
            </p>
          </div>

          {/* QR Code Container */}
          <div className="p-2 bg-white rounded-xl shadow-md shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeImg}
              alt="UPI Payment QR Code"
              className="h-[150px] w-[150px] object-contain animate-fade-in"
              loading="lazy"
            />
          </div>

          <div className="text-center text-[10px] text-muted font-medium select-all">
            UPI VPA: <span className="text-gray-200 font-bold">{upiId}</span>
          </div>

          {/* UTR Input Form */}
          <div className="w-full space-y-2 mt-1">
            <input
              type="text"
              id={`utr-${orderId}`}
              placeholder="Enter 12-digit UPI UTR/Ref No. (optional)"
              className="w-full bg-[#2a3942] border border-border rounded-lg px-2.5 py-1.5 outline-none text-[11px] text-gray-200 placeholder-muted text-center"
            />
            
            <button
              onClick={() => {
                const utrInput = document.getElementById(`utr-${orderId}`) as HTMLInputElement;
                const utrVal = utrInput?.value.trim() || "PAID";
                
                // Trigger backend dispatch to submit payment!
                handleCustomAction(utrVal);
              }}
              className="w-full py-2 bg-accent hover:bg-emerald-600 text-white font-bold rounded-lg text-center shadow-md hover-scale active:scale-95 transition-all text-xs flex items-center justify-center gap-1.5"
            >
              <span>✔️ Confirm Payment</span>
            </button>
          </div>
        </div>
      );
    }

    if (msg.type === "tracking" && msg.payload) {
      const orderData = msg.payload;
      const statusList = ["NEW", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];
      const activeIdx = statusList.indexOf(orderData.status);

      return (
        <div className="mt-2 w-full max-w-[280px]">
          <div className="p-4 rounded-2xl glass border border-border text-xs shadow-md">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-bold text-primary">Order Status Tracker 🛵</span>
              <button 
                onClick={() => handleRefreshOrderStatus(orderData.id)}
                className="p-1.5 hover:bg-border/60 rounded-full text-muted hover:text-primary transition-all duration-300"
                title="Refresh status"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2 relative pl-4 before:content-[''] before:absolute before:left-1 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
              {statusList.map((stat, idx) => {
                const isPast = idx <= activeIdx;
                const isCurrent = idx === activeIdx;

                let text = stat;
                if (stat === "NEW") text = "Placed (ऑर्डर मिला)";
                if (stat === "ACCEPTED") text = "Accepted (मंजूर किया)";
                if (stat === "PREPARING") text = "Preparing (बन रहा है)";
                if (stat === "READY") text = "Food Ready (तैयार है)";
                if (stat === "OUT_FOR_DELIVERY") text = "Out for Delivery (रास्ते में)";
                if (stat === "DELIVERED") text = "Delivered (मिल गया) 🎉";

                return (
                  <div key={stat} className="relative flex items-center gap-3">
                    <span
                      className={`absolute -left-[16px] h-2.5 w-2.5 rounded-full border-2 ${
                        isCurrent
                          ? "bg-primary border-primary scale-125"
                          : isPast
                          ? "bg-accent border-accent"
                          : "bg-background border-border"
                      }`}
                    />
                    <span
                      className={`font-semibold ${
                        isCurrent ? "text-primary text-[12px]" : isPast ? "text-gray-200" : "text-muted"
                      }`}
                    >
                      {text}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-2 border-t border-border flex justify-between text-[10px] text-muted">
              <span>No: #{orderData.orderNo}</span>
              <span>Total: ₹{Number(orderData.totalAmount).toFixed(2)}</span>
            </div>
          </div>
          
          {/* Restart option button */}
          <div className="mt-2.5">
            <button
              onClick={() => handleCustomAction("BACK_TO_MAIN")}
              className="px-4 py-2 w-full bg-[#202c33] hover:bg-[#182229] border border-[#2f3b43] text-gray-200 hover:text-white rounded-full text-xs font-semibold transition-all shadow-sm hover:scale-102 text-center"
            >
              🏠 Place a New Order
            </button>
          </div>
        </div>
      );
    }

    if (msg.type === "payment_link" && msg.payload) {
      const order = msg.payload.order;
      const paymentUrl = msg.payload.paymentUrl;
      const amount = Number(order.totalAmount).toFixed(2);
      const orderNo = order.orderNo;

      return (
        <div className="mt-2 p-4 rounded-2xl glass border border-border max-w-[280px] text-xs shadow-lg flex flex-col items-center gap-3 animate-in fade-in duration-300">
          <h4 className="font-bold text-[#3399cc] text-[13px] border-b border-border pb-1.5 w-full text-center uppercase tracking-wide flex items-center justify-center gap-1">
            💳 Razorpay Payment Link
          </h4>
          
          <div className="text-center space-y-1.5 w-full text-gray-300">
            <div className="flex justify-between text-[11px]">
              <span>Order No:</span>
              <span className="font-bold text-gray-100">#{orderNo}</span>
            </div>
            <div className="flex justify-between text-[11px] border-b border-border/40 pb-1.5 mb-1.5">
              <span>Amount Due:</span>
              <span className="font-black text-emerald-400 text-sm">₹{amount}</span>
            </div>
            <p className="text-[10px] text-muted italic leading-relaxed">
              Online checkout me credit card, debit card, UPI, netbanking ya wallets se pay karein.
            </p>
          </div>

          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 bg-[#3399cc] hover:bg-[#257ba6] text-white font-extrabold rounded-lg text-center shadow-md hover-scale active:scale-95 transition-all text-xs flex items-center justify-center gap-1.5"
          >
            <span>💳 Click to Pay Online</span>
          </a>

          <div className="flex items-center gap-1 text-[9px] text-muted font-sans mt-1">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
            <span>Verified secure via Razorpay</span>
          </div>
        </div>
      );
    }

    return null;
  };





  // Refresh status poller
  const handleRefreshOrderStatus = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders`);
      const data = await res.json();
      if (data.success && data.orders) {
        const fresh = data.orders.find((o: any) => o.id === orderId);
        if (fresh) {
          // Find message with tracking type and update payload
          setMessages((prev) =>
            prev.map((msg) =>
              msg.type === "tracking" && msg.payload.id === orderId
                ? { ...msg, payload: fresh }
                : msg
            )
          );
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-gray-100 antialiased font-sans">
      
      {/* 1. LEFT SIDEBAR PANEL (WhatsApp Chats list) */}
      <div className="hidden md:flex flex-col w-[350px] border-r border-border bg-[#111b21] shrink-0">
        {/* Header Profile */}
        <div className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary tracking-wide border border-primary/30">
              MM
            </div>
            <span className="font-semibold text-gray-200 text-sm">Ashok Kumar</span>
          </div>
          <div className="flex gap-4 text-muted">
            <MoreVertical className="h-5 w-5 hover:text-gray-200 cursor-pointer" />
          </div>
        </div>

        {/* Search Input bar */}
        <div className="p-2 bg-[#111b21]">
          <div className="relative bg-[#202c33] rounded-lg flex items-center px-3 py-1.5 text-xs text-muted">
            <Search className="h-4 w-4 mr-2" />
            <input
              type="text"
              placeholder="Search or start new chat"
              className="bg-transparent border-none outline-none flex-1 text-gray-200 placeholder-muted"
              disabled
            />
          </div>
        </div>

        {/* Chat List Items */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 p-3 bg-[#2a3942] cursor-pointer border-b border-border/20 transition-all">
            <div className="relative h-12 w-12 rounded-full overflow-hidden bg-primary flex items-center justify-center font-extrabold text-white text-base shadow-inner border border-primary-hover">
              🌶️
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-gray-100 flex items-center gap-1.5">
                  Mirch Masala Bot 
                  <span className="h-4 w-4 bg-accent rounded-full flex items-center justify-center text-white text-[9px] font-extrabold" title="Verified business tick">✔</span>
                </h4>
                <span className="text-[10px] text-primary font-bold">Online</span>
              </div>
              <p className="text-[11px] text-muted truncate mt-0.5">
                Namaste! Welcome to Mirch Masala...
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. RIGHT CHAT CANVAS (Active Conversation Area) */}
      <div className="flex-1 flex flex-col h-full whatsapp-bg">
        {/* Chat window Header */}
        <div className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between border-b border-border/40 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-muted hover:text-white transition-all mr-1">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-extrabold text-white text-lg shadow-inner">
              🌶️
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-100 flex items-center gap-1.5">
                Mirch Masala Bot
                <span className="h-3.5 w-3.5 bg-accent rounded-full flex items-center justify-center text-white text-[8px] font-extrabold">✔</span>
              </h3>
              <p className="text-[10px] text-accent tracking-wider font-medium animate-pulse">online</p>
            </div>
          </div>

          <div className="flex gap-4 text-muted">
            <Phone className="h-[18px] w-[18px] hover:text-gray-200 cursor-pointer" />
            <Video className="h-[18px] w-[18px] hover:text-gray-200 cursor-pointer" />
            <MoreVertical className="h-[18px] w-[18px] hover:text-gray-200 cursor-pointer" />
          </div>
        </div>

        {/* Chat Message Scroll canvas */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 flex flex-col">
          {messages.map((msg) => {
            const isBot = msg.sender === "bot";
            return (
              <div
                key={msg.id}
                className={`flex flex-col w-full max-w-[85%] md:max-w-[70%] ${
                  isBot ? "self-start" : "self-end items-end"
                }`}
              >
                {/* Chat Bubble Container */}
                <div
                  className={`p-3 rounded-2xl relative shadow-md ${
                    isBot
                      ? "bg-[#202c33] text-gray-200 rounded-tl-none border border-border/40"
                      : "bg-[#005c4b] text-white rounded-tr-none"
                  }`}
                >
                  <p className="text-xs md:text-sm whitespace-pre-line leading-relaxed leading-5">
                    {msg.content}
                  </p>
                  
                  {/* Interactive Cards & Menus integration */}
                  {renderInteractivePayload(msg)}

                  {/* Bubble Timestamp and ticks */}
                  <div className="flex items-center justify-end gap-1 text-[9px] text-muted/70 mt-1.5">
                    <span>{msg.time}</span>
                    {!isBot && <CheckCheck className="h-3 w-3 text-accent" />}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator Bubble */}
          {isTyping && (
            <div className="self-start flex flex-col w-full max-w-[150px]">
              <div className="p-3 bg-[#202c33] text-muted rounded-2xl rounded-tl-none border border-border/40 flex items-center gap-1.5 shadow-md">
                <span className="text-xs">Bot typing</span>
                <div className="flex gap-0.5 items-center">
                  <span className="h-1.5 w-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat input footer bar */}
        <div className="h-[60px] bg-[#202c33] px-3 flex items-center gap-3 border-t border-border/40 shrink-0">
          <div className="flex gap-3 text-muted shrink-0">
            <Smile className="h-5 w-5 hover:text-gray-200 cursor-pointer" />
            <Paperclip className="h-5 w-5 hover:text-gray-200 cursor-pointer" />
          </div>

          {/* Chat Typing Input Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="flex-1 flex items-center gap-3 h-10"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                botState === "AWAITING_NAME"
                  ? "Type your Full Name here..."
                  : botState === "AWAITING_ADDRESS"
                  ? "Type your complete Delivery Address here..."
                  : botState === "AWAITING_TABLE_NO"
                  ? "Type your Table Number (e.g. 5) here..."
                  : botState === "AWAITING_RAZORPAY_PAYMENT"
                  ? "Type MENU to restart, or wait for payment..."
                  : botState === "AWAITING_ADMIN_APPROVAL"
                  ? "Type MENU to restart, or wait for approval..."
                  : "Click the buttons above to interact..."
              }
              disabled={
                botState !== "AWAITING_NAME" &&
                botState !== "AWAITING_ADDRESS" &&
                botState !== "AWAITING_TABLE_NO" &&
                botState !== "AWAITING_RAZORPAY_PAYMENT" &&
                botState !== "AWAITING_ADMIN_APPROVAL"
              }
              className="flex-1 bg-[#2a3942] rounded-lg px-4 py-2 border-none outline-none text-xs md:text-sm text-gray-200 placeholder-muted disabled:opacity-40 disabled:cursor-not-allowed"
            />
            {(inputValue.trim() || botState === "AWAITING_NAME" || botState === "AWAITING_ADDRESS" || botState === "AWAITING_TABLE_NO" || botState === "AWAITING_RAZORPAY_PAYMENT" || botState === "AWAITING_ADMIN_APPROVAL") ? (
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="h-9 w-9 rounded-full bg-primary hover:bg-primary-hover flex items-center justify-center shrink-0 text-white hover-scale active:scale-95 transition-all shadow-md disabled:opacity-50"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            ) : (
              <div className="text-muted shrink-0">
                <Mic className="h-5 w-5 hover:text-gray-200 cursor-pointer" />
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
export default WhatsAppWebClient;
