import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/Toast";
import BottomNav from "@/components/layout/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "CogniScroll — Apprends en scrollant",
  description: "Transforme ton temps d'écran en apprentissage actif. Fiches de culture générale, quiz, streaks et gamification. 8 thématiques générées par IA.",
  keywords: ["apprentissage", "culture générale", "quiz", "éducation", "micro-learning", "IA"],
  authors: [{ name: "CogniScroll" }],
  icons: {
    icon: "/cogniscroll-logo.svg",
    apple: "/cogniscroll-logo.svg",
  },
  openGraph: {
    title: "CogniScroll — Apprends en scrollant",
    description: "Transforme ton temps d'écran en apprentissage actif.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0A0A1A" />
        {/* iPhone / iPad PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CogniScroll" />
        <link rel="apple-touch-icon" href="/cogniscroll-logo.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>
            {children}
            {/* BottomNav mobile — visible uniquement < 768px via CSS */}
            <BottomNav />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
