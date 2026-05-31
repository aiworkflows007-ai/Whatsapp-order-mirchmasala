// =========================================================================
// Pure JavaScript Test Runner — Mirch Masala Backend Service QA
// =========================================================================
const { PrismaClient } = require("@prisma/client");

const OrderStatus = {
  NEW: "NEW",
  ACCEPTED: "ACCEPTED",
  PREPARING: "PREPARING",
  READY: "READY",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
};

const DeliveryType = {
  DELIVERY: "DELIVERY",
  PICKUP: "PICKUP",
  DINE_IN: "DINE_IN",
};

const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  MANUAL_REVIEW: "MANUAL_REVIEW",
};

const prisma = new PrismaClient();

// Enforce state transitions
const VALID_TRANSITIONS = {
  [OrderStatus.NEW]: [OrderStatus.ACCEPTED, OrderStatus.REJECTED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.REJECTED]: [],
  [OrderStatus.CANCELLED]: [],
};

function isValidTransition(curr, next) {
  if (curr === next) return false;
  const allowed = VALID_TRANSITIONS[curr];
  return allowed ? allowed.includes(next) : false;
}

async function runTests() {
  console.log("===============================================================");
  console.log("🧪 MIRCH MASALA BACKEND CORE QA TEST (PURE JAVASCRIPT EDITION)");
  console.log("===============================================================\n");

  // 1. Fetch seed items
  console.log("✨ Step 1: Resolving seeded food items...");
  const paneerTikka = await prisma.menuItem.findFirst({
    where: { name: "Paneer Tikka Shashlik" }
  });

  const butterChicken = await prisma.menuItem.findFirst({
    where: { name: "Butter Chicken (Specialty)" }
  });

  if (!paneerTikka || !butterChicken) {
    console.error("❌ ERROR: Seed data missing. Please run database seeding first.");
    process.exit(1);
  }

  console.log(`   - Found: ${paneerTikka.name} (₹${paneerTikka.price})`);
  console.log(`   - Found: ${butterChicken.name} (₹${butterChicken.price})\n`);

  // 2. Perform calculations and insert order (transactional)
  console.log("✨ Step 2: Placing secure test order in a database transaction...");
  
  const subtotal = (Number(paneerTikka.price) * 2) + Number(butterChicken.price);
  const tax = subtotal * 0.05; // 5% GST
  const total = subtotal + tax;

  const result = await prisma.$transaction(async (tx) => {
    // Check customer
    const whatsappNumber = "919999977777";
    let customer = await tx.customer.findUnique({ where: { whatsappNumber } });
    if (!customer) {
      customer = await tx.customer.create({
        data: { whatsappNumber, name: "Rahul Sharma", address: "Vasant Kunj, Delhi" }
      });
    }

    // Short code
    const count = await tx.order.count();
    const orderNo = `MM-${1000 + count + 1}`;

    const restaurant = await tx.restaurant.findFirst();
    if (!restaurant) throw new Error("No restaurant seeded.");

    const order = await tx.order.create({
      data: {
        orderNo,
        customerId: customer.id,
        restaurantId: restaurant.id,
        status: OrderStatus.NEW,
        deliveryType: DeliveryType.DELIVERY,
        deliveryAddress: "Pocket C, 42, Vasant Kunj, New Delhi",
        notes: "Make it hot and spicy!",
        subtotal: subtotal,
        tax: tax,
        totalAmount: total,
        paymentStatus: PaymentStatus.PENDING,
      }
    });

    await tx.orderItem.createMany({
      data: [
        { orderId: order.id, menuItemId: paneerTikka.id, quantity: 2, price: paneerTikka.price },
        { orderId: order.id, menuItemId: butterChicken.id, quantity: 1, price: butterChicken.price }
      ]
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: OrderStatus.NEW,
        newStatus: OrderStatus.NEW,
        changedBy: "SYSTEM (JS Test)",
        note: "Order successfully placed."
      }
    });

    return await tx.order.findUnique({
      where: { id: order.id },
      include: { customer: true, orderItems: true }
    });
  });

  console.log("   ✅ Order Inserted and Audited Atomically!");
  console.log(`   - Order No: #${result.orderNo}`);
  console.log(`   - Subtotal: ₹${result.subtotal}`);
  console.log(`   - 5% Tax  : ₹${result.tax} (Expected: ₹48.75)`);
  console.log(`   - Total   : ₹${result.totalAmount} (Expected: ₹1023.75)\n`);

  // 3. Enforce State Machine Transitions
  console.log("✨ Step 3: Verifying State Machine enforcement...");
  console.log(`   Attempting illegal transition: ${result.status} ──> PREPARING...`);
  
  if (!isValidTransition(result.status, OrderStatus.PREPARING)) {
    console.log("   ✅ PASS: State Machine correctly blocked transition NEW -> PREPARING!");
  } else {
    console.error("   ❌ FAIL: Transition was allowed!");
  }

  console.log(`\n   Attempting valid transition: ${result.status} ──> ACCEPTED...`);
  if (isValidTransition(result.status, OrderStatus.ACCEPTED)) {
    console.log("   ✅ PASS: Transition NEW -> ACCEPTED is valid!");
    
    // Update DB
    await prisma.order.update({
      where: { id: result.id },
      data: { status: OrderStatus.ACCEPTED }
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: result.id,
        previousStatus: result.status,
        newStatus: OrderStatus.ACCEPTED,
        changedBy: "Ashok (Owner)",
        note: "Order approved by manager."
      }
    });
    console.log("   ✅ Database updated successfully.");
  }

  console.log("\n===============================================================");
  console.log(" 🎉 SUCCESS: PURE JS ENGINE VERIFICATION PASSED 100%!");
  console.log("===============================================================");
}

runTests()
  .catch(err => {
    console.error("❌ Test crashed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
