import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '조인그룹 가중목 시스템',
  description: '세양 안성공장 가중목 통합 관리 시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
