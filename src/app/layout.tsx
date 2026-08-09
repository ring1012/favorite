import type { Metadata } from "next";
import "./globals.css";
import NextTopLoader from 'nextjs-toploader';

export const metadata: Metadata = {
  title: "EdgeOne Pages Next.js 模板 - 服务端渲染与静态增量生成",
  description: "使用 Next.js 在 EdgeOne Pages 上演示服务端渲染（SSR）与静态增量生成（ISR）。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <head>
        <link rel="icon" href="/eo-logo-blue.svg" />
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
