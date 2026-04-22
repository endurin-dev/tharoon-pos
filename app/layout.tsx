import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'බේකරි කළමනාකරණ පද්ධතිය',
  description: 'බේකරි භාණ්ඩ නිකුත් කිරීම සහ ගිණුම් කිරීමේ පද්ධතිය',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="si">
      <body className="bg-[#0a0f1e] text-white h-screen flex overflow-hidden font-mono">
        <Sidebar />
        <main className="flex-1 overflow-auto flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
