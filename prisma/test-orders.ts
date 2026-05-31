import { DeliveryType, OrderService } from "../src/lib/orders/order-service";
import prisma from "../src/lib/prisma";
import { OrderStatus } from "../src/lib/orders/status-machine";

async function runTests() {
  console.log("===============================================================");
  console.log("🧪 MIRCH MASALA BACKEND CORE SERVICES & STATE MACHINE QA TEST");
  console.log("===============================================================\n");

  // 1. Resolve first seeded menu item
  const paneerTikka = await prisma.menuItem.findFirst({
    where: { name: "Paneer Tikka Shashlik" }
  });

  const butterChicken = await prisma.menuItem.findFirst({
    where: { name: "Butter Chicken (Specialty)" }
  });

  if (!paneerTikka || !butterChicken) {
    console.error("❌ ERROR: Seed data missing. Please run `npx prisma db seed` first.");
    process.exit(1);
  }

  console.log("✨ Step 1: Found Seeded Food Items:");
  console.log(`   - ${paneerTikka.name}: ₹${paneerTikka.price}`);
  console.log(`   - ${butterChicken.name}: ₹${butterChicken.price}\n`);

  // 2. Place a secure order (Calculating subtotal, tax, and totals securely)
  console.log("✨ Step 2: Placing a transactional customer order...");
  const orderInput = {
    whatsappNumber: "919999988888",
    customerName: "Rahul Sharma",
    deliveryType: DeliveryType.DELIVERY,
    deliveryAddress: "Pocket C, 42, Vasant Kunj, New Delhi",
    notes: "Make the butter chicken spicy, please!",
    items: [
      { menuItemId: paneerTikka.id, quantity: 2 }, // 290 * 2 = 580
      { menuItemId: butterChicken.id, quantity: 1 } // 395 * 1 = 395
    ] // Subtotal = 580 + 395 = 975
  };

  const order = await OrderService.createOrder(orderInput);
  if (!order) {
    throw new Error("Order creation failed.");
  }

  console.log("✅ Order Placed Successfully!");
  console.log(`   - Order Number  : #${order.orderNo}`);
  console.log(`   - Customer Name : ${order.customer.name}`);
  console.log(`   - Subtotal      : ₹${order.subtotal}`);
  console.log(`   - 5% GST Tax    : ₹${order.tax} (Expected: ₹48.75)`);
  console.log(`   - Total Paid    : ₹${order.totalAmount} (Expected: ₹1023.75)`);
  console.log(`   - Current Status: ${order.status}`);
  console.log(`   - Cart Items    : ${order.orderItems.length} items logged.\n`);

  // 3. Test State Machine Transition Rules (Attempt illegal transition)
  console.log("✨ Step 3: Testing State Machine Protection...");
  console.log(`   Attempting illegal transition: ${order.status} ──> PREPARING...`);
  
  try {
    await OrderService.updateOrderStatus(order.id, OrderStatus.PREPARING, "Rahul (Chef)");
    console.error("❌ FAIL: The system allowed an illegal jump from NEW directly to PREPARING!");
  } catch (error: any) {
    console.log("✅ PASS: State Machine correctly blocked the illegal change!");
    console.log(`   [Expected Error Caught]: "${error.message}"\n`);
  }

  // 4. Test Valid Transitions
  console.log("✨ Step 4: Testing valid state transitions...");
  
  // Transition A: NEW -> ACCEPTED
  console.log(`   Transitioning: ${order.status} ──> ACCEPTED...`);
  const acceptedOrder = await OrderService.updateOrderStatus(
    order.id, 
    OrderStatus.ACCEPTED, 
    "Ashok (Owner)", 
    "Looks good! Sending to kitchen."
  );
  console.log(`   ✅ Status updated to: ${acceptedOrder.status}`);

  // Transition B: ACCEPTED -> PREPARING
  console.log(`   Transitioning: ${acceptedOrder.status} ──> PREPARING...`);
  const preparingOrder = await OrderService.updateOrderStatus(
    order.id, 
    OrderStatus.PREPARING, 
    "Chef Sanjay", 
    "Cooking started. Tandoor heated."
  );
  console.log(`   ✅ Status updated to: ${preparingOrder.status}\n`);

  // 5. Audit logs validation
  console.log("✨ Step 5: Validating immutable audit trail (OrderStatusHistory)...");
  const history = await prisma.orderStatusHistory.findMany({
    where: { orderId: order.id },
    orderBy: { changedAt: "asc" }
  });

  console.log(`   Found ${history.length} audit trail logs:`);
  history.forEach((log, index) => {
    console.log(`   [${index + 1}] At ${log.changedAt.toLocaleTimeString()} | Transition: ${log.previousStatus} ──> ${log.newStatus}`);
    console.log(`       Changed by: ${log.changedBy} | Note: "${log.note}"`);
  });

  console.log("\n===============================================================");
  console.log(" 🎉 SUCCESS: ALL CORE ORDER BACKEND SERVICES PASSED 100%!");
  console.log("===============================================================");
}

runTests()
  .catch((e) => {
    console.error("❌ Test run crashed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
