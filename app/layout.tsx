import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "./components/Shell";

export const metadata: Metadata = {
  metadataBase: new URL("https://beachroadpizza.com.au"),
  title: {
    default: "Beach Road Pizza | Christies Beach",
    template: "%s | Beach Road Pizza",
  },
  description:
    "Great pizzas, great prices, for a great community. Explore Beach Road Pizza's colourful menu, catering and local story in Christies Beach.",
  icons: {
    icon: "/cursor/pizza.png",
    shortcut: "/cursor/pizza.png",
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    title: "Beach Road Pizza | Christies Beach",
    description: "Great pizzas, great prices, for a great community.",
    siteName: "Beach Road Pizza",
    images: [
      {
        url: "/og-v2.png",
        width: 1734,
        height: 907,
        alt: "Beach Road Pizza with a bright coral message panel and a real food spread",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Beach Road Pizza | Christies Beach",
    description: "Great pizzas, great prices, for a great community.",
    images: ["/og-v2.png"],
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
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
