import type { Metadata } from "next";

import { CharactersAdminClient } from "./characters-admin-client";

export const metadata: Metadata = {
  title: "Admin de Personagens | Ragnarok Farmer",
  description: "Cadastro, edição e exclusão de personagens dentro do Ragnarok Farmer.",
};

export default function CharactersAdminPage() {
  return <CharactersAdminClient />;
}
