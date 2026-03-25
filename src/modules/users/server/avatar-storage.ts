import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const AVATAR_DIRECTORY = path.join(process.cwd(), "public", "uploads", "avatars");
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

export async function saveAvatarFile(file: File) {
  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    throw new Error("Use uma imagem JPG, PNG ou WEBP.");
  }

  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error("A foto precisa ter no maximo 2 MB.");
  }

  await mkdir(AVATAR_DIRECTORY, { recursive: true });

  const extension = ALLOWED_CONTENT_TYPES.get(file.type) ?? ".jpg";
  const filename = `${randomUUID()}${extension}`;
  const absolutePath = path.join(AVATAR_DIRECTORY, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(absolutePath, buffer);

  return `/uploads/avatars/${filename}`;
}

export async function removeAvatarFile(avatarUrl: string | null | undefined) {
  if (!avatarUrl || !avatarUrl.startsWith("/uploads/avatars/")) {
    return;
  }

  const absolutePath = path.join(process.cwd(), "public", avatarUrl.replace(/^\//, ""));

  try {
    await unlink(absolutePath);
  } catch {
    // Ignore missing files so avatar replacement stays idempotent.
  }
}
