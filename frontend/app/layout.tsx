import { Plus_Jakarta_Sans } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "PRISM — Predictive Risk and Infrastructure Status Monitoring",
  description: "Advanced infrastructure risk intelligence and early warning system for India's central sector projects.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable}`}>
      <head>
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {/* Init theme before paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('prism-theme');
                  if (t === 'light') {
                    document.documentElement.setAttribute('data-theme','light');
                    document.documentElement.classList.add('light-mode');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
