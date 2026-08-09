import type { Metadata } from "next";
import "./globals.css";
import NextTopLoader from 'nextjs-toploader';

export const metadata: Metadata = {
  title: "Orbit - 个人网址导航与书签管理",
  description: "简约高效的响应式个人网址导航与书签管理系统。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <head>
        <link rel="icon" href="/orbit-logo.svg" type="image/svg+xml" />
      </head>
      <body className="bg-black text-white antialiased">
        <NextTopLoader 
          color="#3b82f6"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #3b82f6, 0 0 5px #3b82f6"
          zIndex={9999}
        />
        {children}
      </body>
    </html>
  );
}
