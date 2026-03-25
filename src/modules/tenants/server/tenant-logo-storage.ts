import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const TENANT_LOGO_DIRECTORY = path.join(process.cwd(), "public", "uploads", "tenant-logos");
const TENANT_LOGO_URL_PREFIX = "/uploads/tenant-logos/";
const MAX_TENANT_LOGO_SIZE = 8 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"],
]);
const ALLOWED_LOGO_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".svg"]);

type FileLike = File & {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export async function saveTenantLogo(file: File) {
  if (!isFileLike(file) || file.size <= 0) {
    throw new Error("Selecione um arquivo de logo valido.");
  }

  if (file.size > MAX_TENANT_LOGO_SIZE) {
    throw new Error("A logo excede o limite de 8 MB.");
  }

  const extension = resolveExtension(file);

  if (!extension) {
    throw new Error("A logo precisa estar em formato JPG, PNG, WEBP ou SVG.");
  }

  await mkdir(TENANT_LOGO_DIRECTORY, { recursive: true });

  const filename = `${randomUUID()}${extension}`;
  const absolutePath = path.join(TENANT_LOGO_DIRECTORY, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(absolutePath, buffer);

  return `${TENANT_LOGO_URL_PREFIX}${filename}`;
}

export async function removeTenantLogoFile(logoUrl: string | null | undefined) {
  if (!logoUrl || !logoUrl.startsWith(TENANT_LOGO_URL_PREFIX)) {
    return;
  }

  const absolutePath = path.join(process.cwd(), "public", logoUrl.replace(/^\//, ""));

  try {
    await unlink(absolutePath);
  } catch {
    // Ignore missing files to keep cleanup idempotent.
  }
}

export function getTenantLogoFile(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return isFileLike(value) && value.size > 0 ? value : null;
}

function isFileLike(value: FormDataEntryValue | unknown): value is FileLike {
  return Boolean(
    value &&
      typeof value === "object" &&
      "name" in value &&
      "size" in value &&
      "arrayBuffer" in value &&
      typeof value.arrayBuffer === "function",
  );
}

function resolveExtension(file: FileLike) {
  const normalizedType = file.type.toLowerCase();
  const typeExtension = ALLOWED_LOGO_TYPES.get(normalizedType);

  if (typeExtension) {
    return typeExtension === ".jpeg" ? ".jpg" : typeExtension;
  }

  const extension = path.extname(file.name).toLowerCase();

  if (ALLOWED_LOGO_EXTENSIONS.has(extension)) {
    return extension === ".jpeg" ? ".jpg" : extension;
  }

  return null;
}
