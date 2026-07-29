import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const image = `${protocol}://${host}/og.png`;
  return {
    title: "KaiArmy · 项目任务管理",
    description: "规划任务、推进状态、协同交付的一体化项目工作台。",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "KaiArmy · 项目任务管理",
      description: "规划任务 · 推进状态 · 协同交付",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: "KaiArmy 项目任务管理" }],
    },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
