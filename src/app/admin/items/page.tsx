import type { Metadata } from "next";
import Script from "next/script";

import { ItemsAdminClient } from "./items-admin-client";

export const metadata: Metadata = {
  title: "Admin de Itens | Ragnarok Farmer",
  description: "Cadastro, edição e exclusão de itens dentro do Ragnarok Farmer.",
};

export default function ItemsAdminPage() {
  return (
    <>
      <Script
        src="https://www.divine-pride.net/scripts/tooltip.js"
        strategy="afterInteractive"
      />
      <ItemsAdminClient />
    </>
  );
}
