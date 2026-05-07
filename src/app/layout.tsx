import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ToastContainer from "@/components/Toast";

export const metadata: Metadata = {
  title: "万能导入 - 多模板自动导入下单系统",
  description: "支持多种 Excel 模板自动识别与导入的批量下单系统",
  icons: {
    icon: "https://www.ztocc.com/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full flex flex-col relative text-slate-800">
        <div className="bg-mesh"></div>
        <Navbar />
        <main className="flex-1 p-6 z-0">{children}</main>
        <ToastContainer />
      </body>
    </html>
  );
}
