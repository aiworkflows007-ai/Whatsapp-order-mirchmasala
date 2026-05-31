const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

console.log("===============================================================");
const keys = Object.keys(prisma).filter(k => !k.startsWith("_") && !k.startsWith("$"));
console.log("Generated Prisma Client Model Keys:", keys);
console.log("===============================================================");
prisma.$disconnect();
