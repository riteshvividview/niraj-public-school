import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { LanguageProvider } from "@/i18n/context";
import { AuthProvider } from "@/store/auth-store";
import { CartProvider } from "@/store/cart-store";
import { ConsoleAuthProvider } from "@/store/console-auth-store";
import { ReceiptsProvider } from "@/store/receipts-store";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "School Workspace",
  description:
    "Order books, uniform kits, stationery and enroll in school programs — pay online, collect at school.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <AuthProvider>
            <ConsoleAuthProvider>
              <CartProvider>
                <ReceiptsProvider>{children}</ReceiptsProvider>
              </CartProvider>
            </ConsoleAuthProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
