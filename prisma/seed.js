const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Mirch Masala database seeding (Pure JavaScript Edition)...");

  // 1. Clean existing records to ensure idempotency during re-runs
  console.log("🧹 Clearing old data...");
  await prisma.staffUser.deleteMany();
  await prisma.whatsAppMessageLog.deleteMany();
  await prisma.whatsAppConversation.deleteMany();
  await prisma.paymentAttempt.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.tableBooking.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.restaurant.deleteMany();

  // 2. Create Default Restaurant metadata
  console.log("🏢 Seeding restaurant details...");
  const restaurant = await prisma.restaurant.create({
    data: {
      name: "Mirch Masala",
      phone: "+919876543210",
      address: "Ground Floor, 12, Spice Street, Connaught Place, New Delhi, 110001",
      taxRate: 5.00, // 5% GST
      openingHours: "11:00 AM - 11:00 PM",
      isActive: true,
    },
  });
  console.log(`✅ Restaurant created: ${restaurant.name}`);

  // 3. Create Default Staff User
  console.log("👤 Seeding admin staff user...");
  const defaultPassword = process.env.SEED_OWNER_PASSWORD || "ChangeMeNow123!";
  const staff = await prisma.staffUser.create({
    data: {
      username: "admin",
      passwordHash: await bcrypt.hash(defaultPassword, 12),
      role: "OWNER",
      name: "Ashok Kumar (Owner)",
    },
  });
  console.log(`✅ Admin staff created (Username: ${staff.username}). Change the seed password after first login.`);

  // 4. Create Food Categories
  console.log("📁 Seeding food categories...");
  const vegStartersCat = await prisma.category.create({
    data: { name: "Starters (Veg)", slug: "starters-veg", description: "Crispy and spicy tandoori vegetarian appetizers", position: 0 }
  });
  const nonVegStartersCat = await prisma.category.create({
    data: { name: "Starters (Non-Veg)", slug: "starters-nonveg", description: "Juicy tandoori chicken, seekhs and meats", position: 1 }
  });
  const mainsCat = await prisma.category.create({
    data: { name: "Tandoori Mains & Curries", slug: "mains", description: "Authentic North Indian curries and special gravies", position: 2 }
  });
  const biryaniCat = await prisma.category.create({
    data: { name: "Biryanis & Rice", slug: "biryanis-rice", description: "Aromatic slow-cooked basmati rice preparations", position: 3 }
  });
  const breadsCat = await prisma.category.create({
    data: { name: "Indian Tandoori Breads", slug: "breads", description: "Freshly baked clay-oven rotis and naans", position: 4 }
  });
  const dessertsCat = await prisma.category.create({
    data: { name: "Sweet Desserts", slug: "desserts", description: "Traditional sweet endings for a spicy meal", position: 5 }
  });
  const beveragesCat = await prisma.category.create({
    data: { name: "Chilled Beverages", slug: "beverages", description: "Refreshing Indian drinks and soft sodas", position: 6 }
  });
  console.log("✅ 7 Categories seeded successfully.");

  // 5. Create Menu Items
  console.log("🍽️ Seeding menu items...");
  const menuItems = [
    // --- Starters (Veg) ---
    {
      name: "Paneer Tikka Shashlik",
      description: "Cubes of fresh cottage cheese marinated in yoghurt, saffron and hand-ground spices, grilled in a traditional clay tandoor with onions and bell peppers.",
      price: 290.00,
      isVegetarian: true,
      imageUrl: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=60",
      categoryId: vegStartersCat.id,
      position: 0
    },
    {
      name: "Hara Bhara Kabab",
      description: "Crispy pan-fried patties made of finely minced spinach, green peas and potatoes, stuffed with chopped nuts and aromatic spices.",
      price: 240.00,
      isVegetarian: true,
      imageUrl: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60",
      categoryId: vegStartersCat.id,
      position: 1
    },
    {
      name: "Tandoori Malai Chaap",
      description: "Soya chaap sticks marinated in rich cashew paste, cheese, fresh cream, cardamom, and white pepper, baked in tandoor.",
      price: 260.00,
      isVegetarian: true,
      imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60",
      categoryId: vegStartersCat.id,
      position: 2
    },

    // --- Starters (Non-Veg) ---
    {
      name: "Tandoori Chicken (Half)",
      description: "The classic Indian classic! Juicy tender chicken on the bone marinated in spiced yoghurt, Kashmiri chillies and direct roasted in a charcoal tandoor.",
      price: 320.00,
      isVegetarian: false,
      imageUrl: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500&auto=format&fit=crop&q=60",
      categoryId: nonVegStartersCat.id,
      position: 0
    },
    {
      name: "Murgh Malai Tikka",
      description: "Bitesized boneless chicken chunks marinated overnight in fresh cream, cream-cheese, coriander root, and mild green chillies, cooked till tender.",
      price: 350.00,
      isVegetarian: false,
      imageUrl: "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=500&auto=format&fit=crop&q=60",
      categoryId: nonVegStartersCat.id,
      position: 1
    },
    {
      name: "Spicy Mutton Seekh Kabab",
      description: "Finely minced fresh goat meat infused with chopped mint, ginger, green chillies, and Royal cumin seeds, skewered and roasted to juicy perfection.",
      price: 390.00,
      isVegetarian: false,
      imageUrl: "https://images.unsplash.com/photo-1532636875304-0c8fe1197e14?w=500&auto=format&fit=crop&q=60",
      categoryId: nonVegStartersCat.id,
      position: 2
    },

    // --- Mains ---
    {
      name: "Butter Chicken (Specialty)",
      description: "Our signature dish! Shredded charcoal-grilled tandoori chicken cooked in a rich, velvety tomato gravy with cashew paste, dry fenugreek leaves (kasoori methi) and home-churned butter.",
      price: 395.00,
      isVegetarian: false,
      imageUrl: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60",
      categoryId: mainsCat.id,
      position: 0
    },
    {
      name: "Kadhai Paneer Premium",
      description: "Fresh cottage cheese cooked with chopped bell peppers, onions, tomatoes, and freshly roasted coriander seeds and dried red chillies in a traditional cast-iron wok.",
      price: 320.00,
      isVegetarian: true,
      imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=60",
      categoryId: mainsCat.id,
      position: 1
    },
    {
      name: "Dal Makhani (Slow Cooked)",
      description: "Whole black lentils and red kidney beans slow-cooked overnight on charcoal embers with tomatoes, garlic, butter, and cream. Unmatched richness!",
      price: 280.00,
      isVegetarian: true,
      imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=60",
      categoryId: mainsCat.id,
      position: 2
    },

    // --- Biryani & Rice ---
    {
      name: "Kolkata Mutton Dum Biryani",
      description: "Fragrant basmati rice slow-cooked under steam (Dum) with tender cuts of spice-marinated goat meat, boiled egg, and the traditional slow-steamed potato, infused with saffron and rose water.",
      price: 420.00,
      isVegetarian: false,
      imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60",
      categoryId: biryaniCat.id,
      position: 0
    },
    {
      name: "Hyderabadi Chicken Biryani",
      description: "Long-grain basmati rice and marinated chicken layered with brown onions, fresh mint, and pure ghee, cooked in sealed clay pot on a slow fire.",
      price: 360.00,
      isVegetarian: false,
      imageUrl: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=60",
      categoryId: biryaniCat.id,
      position: 1
    },
    {
      name: "Veg Subz Biryani",
      description: "A garden-fresh assortment of seasonal vegetables, cottage cheese cubes, and basmati rice flavored with cardamom, saffron, and mint.",
      price: 310.00,
      isVegetarian: true,
      imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=60",
      categoryId: biryaniCat.id,
      position: 2
    },

    // --- Breads ---
    {
      name: "Butter Naan",
      description: "Leavened refined flour bread baked in a hot tandoori clay oven, brushed generously with pure butter.",
      price: 60.00,
      isVegetarian: true,
      imageUrl: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60",
      categoryId: breadsCat.id,
      position: 0
    },
    {
      name: "Garlic Butter Naan",
      description: "Leavened clay-oven flatbread flavored with finely minced garlic, fresh coriander leaves, and glazed with fresh butter.",
      price: 75.00,
      isVegetarian: true,
      imageUrl: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60",
      categoryId: breadsCat.id,
      position: 1
    },
    {
      name: "Tandoori Roti (Butter)",
      description: "Whole wheat unleavened bread baked in the clay oven and smeared with butter.",
      price: 45.00,
      isVegetarian: true,
      imageUrl: null,
      categoryId: breadsCat.id,
      position: 2
    },

    // --- Desserts ---
    {
      name: "Gulab Jamun (with Rabri)",
      description: "Deep fried evaporated milk dumplings soaked in cardamom-flavored sugar syrup, served warm over a bed of chilled, slow-reduced sweetened creamy milk (rabri).",
      price: 130.00,
      isVegetarian: true,
      imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=60",
      categoryId: dessertsCat.id,
      position: 0
    },
    {
      name: "Royal Kesari Rasmalai",
      description: "Two flattened soft cottage cheese discs poached in sweetened milk reduced with saffron, pistachio and green cardamom, served chilled.",
      price: 140.00,
      isVegetarian: true,
      imageUrl: null,
      categoryId: dessertsCat.id,
      position: 1
    },

    // --- Beverages ---
    {
      name: "Mango Lassi (Chilled)",
      description: "A thick, refreshing traditional drink made of whipped sweet yoghurt, fresh pulp of Alphonso mangoes, and rose water garnish.",
      price: 95.00,
      isVegetarian: true,
      imageUrl: "https://images.unsplash.com/photo-1546173159-315724a31696?w=500&auto=format&fit=crop&q=60",
      categoryId: beveragesCat.id,
      position: 0
    },
    {
      name: "Fresh Lime Soda (Mix)",
      description: "Freshly squeezed lime juice served with sparkling soda water, spiced with black salt and sugar syrup.",
      price: 70.00,
      isVegetarian: true,
      imageUrl: null,
      categoryId: beveragesCat.id,
      position: 1
    }
  ];

  for (const item of menuItems) {
    const createdItem = await prisma.menuItem.create({
      data: item
    });
    console.log(`🍽️  Item added: ${createdItem.name} - ₹${createdItem.price}`);
  }

  console.log("🌱 Database seeding complete! Mirch Masala is ready for operation.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
