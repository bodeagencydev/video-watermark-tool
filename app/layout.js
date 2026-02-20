import './globals.css';

export const metadata = {
  title: 'Video Watermark Tool',
  description: 'Upload a video and add a text watermark.'
};

// Root layout for the app router. It wraps all pages in a standard HTML shell.
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
