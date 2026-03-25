import "server-only";

import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/server/env";

const LEGACY_ATTACHMENT_URL_PREFIX = "/uploads/tickets/";
const DEFAULT_ATTACHMENT_DIRECTORY = path.join(process.cwd(), "storage", "tickets");
const ATTACHMENT_DIRECTORY = path.resolve(env.ATTACHMENTS_ROOT_DIR ?? DEFAULT_ATTACHMENT_DIRECTORY);
const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_REQUEST = 5;
const ALLOWED_CONTENT_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["application/pdf", ".pdf"],
  ["text/plain", ".txt"],
  ["text/csv", ".csv"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
  ["application/msword", ".doc"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
  ["application/vnd.ms-excel", ".xls"],
  ["application/zip", ".zip"],
  ["application/x-zip-compressed", ".zip"],
  ["application/vnd.rar", ".rar"],
  ["application/x-rar-compressed", ".rar"],
  ["application/octet-stream", ""],
]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf", ".txt", ".csv", ".doc", ".docx", ".xls", ".xlsx", ".zip", ".rar"]);

export type SavedTicketAttachment = {
  originalName: string;
  fileUrl: string;
  contentType: string;
  sizeBytes: number;
};

type FileLike = File & {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export function isFormDataFile(value: FormDataEntryValue): value is File {
  return isFileLike(value);
}

export function getFormDataFiles(formData: FormData, fieldName: string) {
  return formData.getAll(fieldName).filter(isFileLike);
}

export async function saveTicketAttachments(files: File[]) {
  const validFiles = files.filter((file) => file.size > 0);

  if (validFiles.length === 0) {
    return [] satisfies SavedTicketAttachment[];
  }

  if (validFiles.length > MAX_ATTACHMENTS_PER_REQUEST) {
    throw new Error(`Envie no maximo ${MAX_ATTACHMENTS_PER_REQUEST} anexos por vez.`);
  }

  await mkdir(ATTACHMENT_DIRECTORY, { recursive: true });

  const savedFiles: SavedTicketAttachment[] = [];

  for (const file of validFiles) {
    const extension = resolveExtension(file);

    if (!extension) {
      throw new Error(`O arquivo ${file.name} nao possui um formato suportado.`);
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      throw new Error(`O arquivo ${file.name} excede o limite de 25 MB.`);
    }

    const filename = `${randomUUID()}${extension}`;
    const absolutePath = path.join(ATTACHMENT_DIRECTORY, filename);
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(absolutePath, buffer);

    savedFiles.push({
      originalName: file.name,
      fileUrl: filename,
      contentType: normalizeContentType(file, extension),
      sizeBytes: file.size,
    });
  }

  return savedFiles;
}

export async function removeTicketAttachmentFile(fileUrl: string | null | undefined) {
  if (!fileUrl) {
    return;
  }

  const absolutePath = resolveAttachmentAbsolutePath(fileUrl);

  try {
    await unlink(absolutePath);
  } catch {
    // Ignore missing files to keep cleanup idempotent.
  }
}

export async function readTicketAttachmentFile(fileUrl: string) {
  return readFile(resolveAttachmentAbsolutePath(fileUrl));
}

export async function ticketAttachmentExists(fileUrl: string) {
  try {
    await access(resolveAttachmentAbsolutePath(fileUrl));
    return true;
  } catch {
    return false;
  }
}

function resolveAttachmentAbsolutePath(fileUrl: string) {
  if (fileUrl.startsWith(LEGACY_ATTACHMENT_URL_PREFIX)) {
    return path.join(process.cwd(), "public", fileUrl.replace(/^\//, ""));
  }

  const normalizedRelativePath = fileUrl.replace(/\\/g, "/").replace(/^\/+/, "");
  return path.join(ATTACHMENT_DIRECTORY, normalizedRelativePath);
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
  const typeExtension = ALLOWED_CONTENT_TYPES.get(normalizedType);

  if (typeExtension) {
    return typeExtension === ".jpeg" ? ".jpg" : typeExtension;
  }

  const extension = path.extname(file.name).toLowerCase();

  if (ALLOWED_EXTENSIONS.has(extension)) {
    return extension === ".jpeg" ? ".jpg" : extension;
  }

  return null;
}

function normalizeContentType(file: FileLike, extension: string) {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }

  const fallbackByExtension = new Map([
    [".jpg", "image/jpeg"],
    [".png", "image/png"],
    [".webp", "image/webp"],
    [".pdf", "application/pdf"],
    [".txt", "text/plain"],
    [".csv", "text/csv"],
    [".doc", "application/msword"],
    [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    [".xls", "application/vnd.ms-excel"],
    [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    [".zip", "application/zip"],
    [".rar", "application/x-rar-compressed"],
  ]);

  return fallbackByExtension.get(extension) ?? "application/octet-stream";
}
