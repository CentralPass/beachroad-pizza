import type { Metadata } from "next";
import "./globals.css";
import "./ordering.css";
import { Shell } from "./components/Shell";
import { CartProvider } from "./components/CartProvider";
import { GoogleTag } from "./components/GoogleTag";
import { StoreStatusProvider } from "./components/providers/StoreStatusProvider";
import { ToastProvider } from "./components/providers/ToastProvider";
import { VenueProvider } from "./components/providers/VenueProvider";
import { SITE_URL } from "./lib/venue";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Beach Road Pizza | Christies Beach",
    template: "%s | Beach Road Pizza",
  },
  description:
    "Great pizzas, great prices, for a great community. Explore Beach Road Pizza's colourful menu, local deals and family story in Christies Beach.",
  icons: {
    icon: "/brand/beach-road-pizza-logo-v1.png",
    shortcut: "/brand/beach-road-pizza-logo-v1.png",
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    title: "Beach Road Pizza | Christies Beach",
    description: "Great pizzas, great prices, for a great community.",
    siteName: "Beach Road Pizza",
    images: [
      {
        url: "/og-v3.png",
        width: 1731,
        height: 909,
        alt: "Beach Road Pizza menu-colour social card with a real pizza and sides spread",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Beach Road Pizza | Christies Beach",
    description: "Great pizzas, great prices, for a great community.",
    images: ["/og-v3.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU">
      <body>
        <VenueProvider>
          <StoreStatusProvider>
            <ToastProvider>
              <CartProvider>
                <Shell>{children}</Shell>
              </CartProvider>
            </ToastProvider>
          </StoreStatusProvider>
        </VenueProvider>
        <GoogleTag />
      </body>
    </html>
  );
}
