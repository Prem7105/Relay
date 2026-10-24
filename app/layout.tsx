import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "Relay — Already going? Bring something back.",
  description: "Campus shared pickups. Demo prototype.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#163C34" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
