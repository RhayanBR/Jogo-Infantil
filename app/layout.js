import "./globals.css";
import CursorMao from "./cursor-mao";

export const metadata = {
  title: "Nomes",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <CursorMao />
      </body>
    </html>
  );
}
