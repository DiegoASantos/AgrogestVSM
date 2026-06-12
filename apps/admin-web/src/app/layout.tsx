import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthSessionProvider } from "../modules/auth/state/auth-session-provider";
import { siteConfig } from "../shared/constants/site";
import "./globals.css";

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description
};

export const dynamic = "force-dynamic";

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
