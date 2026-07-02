import type { Metadata } from "next";

import { InstancesAdminClient } from "./instances-admin-client";

export const metadata: Metadata = {
  title: "Admin de Instâncias | Ragnarok Farmer",
  description: "Cadastro, edição e exclusão de instâncias dentro do Ragnarok Farmer.",
};

export default function InstancesAdminPage() {
  return <InstancesAdminClient />;
}
