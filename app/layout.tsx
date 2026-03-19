import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import AuthProvider from '@/components/AuthProvider';
import FancyCursor from '@/components/FancyCursor';
import PWARegister from '@/components/PWARegister';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI Quiz – Generate Personalised Quizzes Instantly',
  description:
    'An AI-powered quiz generator. Enter any topic, choose difficulty, and get a unique quiz in seconds. Track your history and improve over time.',
  keywords: ['quiz', 'AI quiz', 'learning', 'trivia', 'education'],
  openGraph: {
    title: 'AI Quiz',
    description: 'Generate and take AI-powered quizzes on any topic.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AuthProvider>
          <PWARegister />
          <FancyCursor />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
