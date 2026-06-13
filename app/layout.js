import './globals.css';

export const metadata = {
  title: 'Trivia Run',
  description: 'Live multi-screen trivia game',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
