import type { Metadata } from 'next';
// @ts-ignore: CSS module type declarations not found
import './globals.css';

export const metadata: Metadata = {
  title: 'AgriculMS - AI-Powered Agricultural Management System',
  description: 'Digital Agriculture Platform for Bangladesh — AI Advisory, Marketplace, Crop Listings',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  );
}
