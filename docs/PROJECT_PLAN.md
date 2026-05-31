# Project Plan — Mirch Masala Unified WhatsApp Restaurant Ordering System

Welcome to the **Mirch Masala WhatsApp Restaurant Ordering System**! This is the master blueprint and reference document for our implementation journey.

In this architecture, we focus on **one unified order system** which operates **exclusively via a conversational WhatsApp flow**. 
*   **Customer Experience**: Customers order entirely by chatting with our bot. On the website, we present a premium, immersive **WhatsApp Web Client** (chat interface). In production, customers can use real WhatsApp, which connects to the same backend bot logic.
*   **Restaurant Staff Experience**: A gorgeous, premium **Admin Dashboard** (`/admin`) with a Kanban board for managing orders.

---

## 1. Project Tech Stack & Tools

*   **Framework**: Next.js 14+ (App Router) with TypeScript (Strict Mode).
*   **Styling**: Vanilla TailwindCSS for premium, responsive layouts.
*   **Database**: PostgreSQL (relational database).
*   **ORM**: Prisma for type-safe database queries.
*   **Validation**: Zod (for API validation and environment variables verification).
*   **State Management**: React state, context, and modern storage patterns.
*   **WhatsApp API**: Meta WhatsApp Cloud API (Graph API) with secure signature validation.

---

## 2. Updated System Architecture & Folder Layout

We have streamlined the structure. Traditional checkout and menu pages are replaced by a unified chat-driven interface on the homepage.

```text
src/
  app/
    layout.tsx               # Global styles, Outfit/Inter font loader, theme providers
    page.tsx                 # Public Landing Page & Immersive WhatsApp Web Client
    admin/                   # Restaurant Staff Dashboard
      orders/                # Real-time Kanban order pipeline board
      kitchen/               # Live kitchen tickets display
      menu/                  # Manage menu item stock, pricing, and active status
      bookings/              # Dine-in reservation table manager
    api/                     # API Endpoints
      whatsapp/
        webhook/             # Meta webhook endpoint (GET verify, POST receive)
        demo-chat/           # Server-side endpoint for simulated web chat conversations
      admin/
        orders/              # Status updates, kitchen tickets API
        menu/                # Admin menu management API
        bookings/            # Admin booking approval API
  components/
    ui/                      # Premium atoms (Button, Badge, Modal, Input, Custom Skeletons)
    admin/                   # Kanban columns, order details drawer, sound notifications
    chat/                    # WhatsApp Web Client UI (bubbles, list menus, category cards, interactive cart)
  lib/
    prisma.ts                # Prisma client singleton
    env.ts                   # Environment variables validation using Zod
    logger.ts                # Server console logs
    whatsapp/
      client.ts              # WhatsApp API Client (Axios wrapper for Meta API)
      webhook.ts             # Webhook signature validator
      parser.ts              # Normalizes incoming messages from Web Client vs. Meta API
      templates.ts           # Shared message templates (interactive button menus, lists)
      conversation-engine.ts # Single State Machine processing logic
    orders/
      status-machine.ts      # Strictly validates order status changes
      order-service.ts       # Database CRUD operations for orders
    payments/
      qr-demo.ts             # UPI QR code generation helper
  prisma/
    schema.prisma            # Database models (PostgreSQL)
    seed.ts                  # Mirch Masala Indian culinary seed data
  docs/
    PROJECT_PLAN.md          # Comprehensive roadmap (Phase 0 - 10)
```

---

## 3. Order Status State Machine

To prevent invalid transitions and ensure the integrity of our ordering workflow, we follow a strict **Order Status State Machine**:

```text
       [NEW] ─── (Reject) ───> [REJECTED]
         │
     (Accept)
         │
         ▼
    [ACCEPTED] ─── (Cancel by Admin) ───> [CANCELLED]
         │
     (Prepare)
         │
         ▼
   [PREPARING]
         │
      (Ready)
         │
         ▼
     [READY]
         │
    (Ship/Deliver)
         │
         ▼
 [OUT_FOR_DELIVERY] (or [READY_FOR_PICKUP] / [SERVED])
         │
     (Complete)
         │
         ▼
    [DELIVERED]
```

### Transition Audit Trail
Every single status change is recorded inside the `OrderStatusHistory` model to track:
*   `previousStatus`
*   `newStatus`
*   `changedBy` (System, Staff, WhatsApp Bot)
*   `changedAt` (Timestamp)
*   `note` (e.g., "Kitchen busy", "Rider dispatched")

---

## 4. Conversation State Machine (WhatsApp Chat Flow)

The conversational bot guides customers step-by-step through a stateful experience:

*   **START**: Customer sends any message. The bot greets them and presents the **MAIN_MENU**.
*   **MAIN_MENU**: Customer can choose:
    1.  *View Menu & Order* -> Moves to **VIEW_CATEGORIES**
    2.  *Track Order* -> Moves to **ORDER_TRACKING**
    3.  *Book a Table* -> Moves to **TABLE_BOOKING**
    4.  *Talk to Staff* -> Moves to **HUMAN_SUPPORT**
*   **VIEW_CATEGORIES**: Displays interactive category bubbles (e.g., Starters, Main Course). Choosing a category shows items (**VIEW_MENU**).
*   **VIEW_MENU**: Displays menu items in the chosen category. On the Web Client, this displays as rich cards. For real WhatsApp, it uses Meta List Templates. Clicking "Add to Cart" updates the active cart state.
*   **CART_REVIEW**: Shows itemized items, pricing, and custom instructions. Offers option to "Proceed to Checkout" or "Edit Cart".
*   **CUSTOMER_DETAILS**: Gathers details sequentially or via interactive form:
    *   Name
    *   Delivery Type: `Delivery`, `Pickup`, or `Dine-in` (asks for Table Number)
    *   Delivery Address (if Delivery)
*   **PAYMENT**: Shows payment options (Cash on Delivery/UPI QR code). Once chosen, moves to **ORDER_CONFIRM**.
*   **ORDER_CONFIRM**: Order is finalized and saved in database. An order number is generated and sent along with a live tracking link.
*   **ORDER_TRACKING**: Bot retrieves and reports active order status.
*   **HUMAN_SUPPORT**: Pauses the bot flow so a real human agent can chat with the customer.

---

## 5. Environment Variables & Security Config

Create a `.env.local` file inside the root directory with the following variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/mirch_masala?schema=public"

# App Deployment Config
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# WhatsApp Cloud API Credentials
WHATSAPP_PHONE_NUMBER_ID="1108880012314284"
WHATSAPP_BUSINESS_ACCOUNT_ID="36089193224059024"
WHATSAPP_ACCESS_TOKEN="your_access_token_here"
WHATSAPP_VERIFY_TOKEN="mirch_masala_verify_token_secure"
WHATSAPP_APP_SECRET="your_app_secret_here"

# System Operation Mode
WHATSAPP_MODE="demo" # Change to "real" to activate live Meta Cloud API Webhooks
```

---

## 6. Detailed Phase-by-Phase Roadmap

### PHASE 0 — Project Audit & Setup (CURRENT)
*   **Actions**: Audit empty workspace, define strictly unified WhatsApp-first model, establish file routing structures.
*   **Deliverables**: `docs/PROJECT_PLAN.md` and `implementation_plan.md` artifact. Stop for approval.

### PHASE 1 — Database Foundation
*   **Actions**: Design Prisma models, connect to PostgreSQL, and seed authentic Indian menus (Mirch Masala specials).
*   **Deliverables**: `prisma/schema.prisma` and `prisma/seed.ts`.

### PHASE 2 — Core Order Backend
*   **Actions**: Create APIs for placing and updating orders. Enforce Zod validation and transition rules.
*   **Deliverables**: `/api/orders`, `/api/orders/[id]/status` API.

### PHASE 3 — Customer WhatsApp Web Client
*   **Actions**: Develop the homepage `/` as a stunning, full-screen **WhatsApp Web Chat Client** where customers can browse, cart, checkout, and track.
*   **Deliverables**: Immersive homepage chat UI layout.

### PHASE 4 — Admin Order Kanban Dashboard
*   **Actions**: Develop the real-time staff order management desk (`/admin/orders`) and live kitchen display (`/admin/kitchen`).
*   **Deliverables**: Multi-column Kanban interface, cooking timers, alert triggers.

### PHASE 5 — Unified Conversation Engine
*   **Actions**: Write the state-machine processor (`conversation-engine.ts`) to drive both the Web Chat client and Meta webhook API consistently.
*   **Deliverables**: Integrated chat engine.

### PHASE 6 — Real Meta WhatsApp API Integration
*   **Actions**: Connect the Meta webhook endpoint (`/api/whatsapp/webhook`), secure request signature parsing, and list template output routines.
*   **Deliverables**: Live WhatsApp messaging.

### PHASE 7 — Payment QR Card & Sandbox Panel
*   **Actions**: Dynamically show custom UPI payment QR cards inside the chat stream and admin manual confirm controls.
*   **Deliverables**: QR component generator, `/demo/control` payment panel.

### PHASE 8 — Dine-in Reservation Flow
*   **Actions**: Enable table bookings inside the conversation engine, complete with staff status confirmations.
*   **Deliverables**: Booking API, `/booking` page, conversational table booking flows.

### PHASE 9 — Production Hardening
*   **Actions**: Deploy rate-limiters, environment variables guards, and server-side loggers.
*   **Deliverables**: System security guidelines, Nginx config notes.

### PHASE 10 — Animation & Polish
*   **Actions**: Inject premium micro-animations (Framer Motion), perfect loading skeletons, and interactive charts demonstrating Swiggy/Zomato commission savings.
*   **Deliverables**: Production-grade dashboard metrics, animated user interfaces.
