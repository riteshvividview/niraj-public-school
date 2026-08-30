import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { SWRConfig } from "swr";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/i18n/context";
import { AuthProvider } from "@/store/auth-store";
import { CartProvider } from "@/store/cart-store";
import { ConsoleAuthProvider } from "@/store/console-auth-store";
import { ThemeProvider } from "@/store/theme-store";
import "./globals.css";

/**
 * Applies the persisted theme class before first paint — runs blocking, in
 * <head>, ahead of any hydration — so there's no flash of the wrong theme.
 * Kept in sync with src/store/theme-store.tsx's storage key/values.
 */
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = window.localStorage.getItem("nps-theme");
    if (stored === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "School Workspace",
  description:
    "Order books, uniform kits and enroll in school programs — pay online, collect at school.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <LanguageProvider>
            {/* One SWR cache for the whole app — same dedupingInterval/revalidateOnFocus
                already proven by the console's own SWRConfig (console/(dashboard)/layout.tsx),
                applied once here so every parent/student page inherits it instead of
                each page configuring (or forgetting to configure) its own. */}
            <SWRConfig value={{ revalidateOnFocus: true, dedupingInterval: 15000 }}>
              <AuthProvider>
                <ConsoleAuthProvider>
                  <CartProvider>{children}</CartProvider>
                </ConsoleAuthProvider>
              </AuthProvider>
            </SWRConfig>
          </LanguageProvider>
        </ThemeProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
