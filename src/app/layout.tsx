import type { Metadata } from "next";
import "@/styles/globals.css";

import { prisma } from "@/lib/db";
import OnboardingPage from "@/app/onboarding/page";
import DashboardStateInitializer from "@/components/layout/DashboardStateInitializer";

export const metadata: Metadata = {
  title: "RecallAgent",
  description:
    "A memory-aware coding review Agent for deliberate practice",
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await prisma.user.findFirst();

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="antialiased bg-gray-50 text-gray-900 selection:bg-[#ffa116] selection:text-white"
      >
        {user ? (
          <>
            <DashboardStateInitializer user={user} />
            {children}
          </>
        ) : (
          <OnboardingPage />
        )}
      </body>
    </html>
  );
}
