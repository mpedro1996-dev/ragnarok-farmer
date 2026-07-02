import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const nextStandaloneDir = path.join(projectRoot, ".next", "standalone");
const nextStaticDir = path.join(projectRoot, ".next", "static");
const publicDir = path.join(projectRoot, "public");
const tauriBundleRoot = path.join(projectRoot, "src-tauri", "bundle");
const tauriAppDir = path.join(tauriBundleRoot, "app");
const tauriBinDir = path.join(tauriBundleRoot, "bin");
const bundledStaticDir = path.join(tauriAppDir, ".next", "static");
const bundledPublicDir = path.join(tauriAppDir, "public");
const nodeExecutableName = process.platform === "win32" ? "node.exe" : "node";
const bundledNodePath = path.join(tauriBinDir, nodeExecutableName);

await ensureExists(nextStandaloneDir, "A build standalone do Next não foi encontrada.");
await ensureExists(nextStaticDir, "Os assets estáticos do Next não foram encontrados.");

await rm(tauriBundleRoot, { recursive: true, force: true });
await mkdir(tauriBinDir, { recursive: true });
await cp(nextStandaloneDir, tauriAppDir, { recursive: true });
await cp(nextStaticDir, bundledStaticDir, { recursive: true });

if (existsSync(publicDir)) {
  await cp(publicDir, bundledPublicDir, { recursive: true });
}

await copyFile(process.execPath, bundledNodePath);

console.log("Pacote do Tauri preparado com servidor Next standalone e runtime Node.");
console.log(`Node empacotado em: ${bundledNodePath}`);
console.log(`Aplicação empacotada em: ${tauriAppDir}`);

async function ensureExists(targetPath, errorMessage) {
  if (!existsSync(targetPath)) {
    throw new Error(errorMessage);
  }
}
