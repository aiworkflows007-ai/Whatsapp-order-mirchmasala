const REQUIRED_PRODUCTION_ENV = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
];

let validated = false;

export function validateProductionEnv() {
  if (validated || process.env.NODE_ENV !== "production") return;

  const missing = REQUIRED_PRODUCTION_ENV.filter((key) => {
    const value = process.env[key];
    return !value || value.includes("placeholder") || value.includes("PASTE_") || value.startsWith("your_");
  });

  if (missing.length > 0) {
    throw new Error(`Missing or placeholder production environment variables: ${missing.join(", ")}`);
  }

  if (!process.env.DATABASE_URL?.startsWith("postgresql://") && !process.env.DATABASE_URL?.startsWith("postgres://")) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string in production.");
  }

  if ((process.env.SESSION_SECRET || "").length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters in production.");
  }

  validated = true;
}
