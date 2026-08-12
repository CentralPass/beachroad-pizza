import type { Metadata } from "next";
import { Bebas_Neue, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Shell } from "./components/Shell";

const display = Bebas_Neue({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://beachroadpizza.com.au"),
  title: {
    default: "Beach Road Pizza | Christies Beach",
    template: "%s | Beach Road Pizza",
  },
  description:
    "Great pizzas, great prices, for a great community. Explore Beach Road Pizza's menu, catering and local story in Christies Beach.",
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
        url: "/og.png",
        width: 1728,
        height: 921,
        alt: "Beach Road Pizza with a spread of real pizzas, wings, chips and wedges",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Beach Road Pizza | Christies Beach",
    description: "Great pizzas, great prices, for a great community.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU">
      <body className={`${display.variable} ${body.variable}`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
