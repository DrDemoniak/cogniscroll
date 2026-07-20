import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "CogniScroll — Apprends en scrollant",
  description: "Transforme ton temps d'écran en apprentissage actif. Fiches de culture générale, quiz, streaks et gamification. 8 thématiques générées par IA.",
  keywords: ["apprentissage", "culture générale", "quiz", "éducation", "micro-learning", "IA"],
  authors: [{ name: "CogniScroll" }],
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
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
