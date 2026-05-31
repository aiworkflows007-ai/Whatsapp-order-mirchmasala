import "./globals.css";
import PWARegister from "@/components/PWARegister";

export const metadata = {
  title: "Mirch Masala Restaurant",
  description: "Authentic North Indian Cuisine. Order via WhatsApp.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Mirch Admin",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: "/icons/icon-192.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0d0f12",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
