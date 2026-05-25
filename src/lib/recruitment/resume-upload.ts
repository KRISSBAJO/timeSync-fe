"use client";

export type PublicResumeUpload = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
};

const MAX_RESUME_BYTES = 3 * 1024 * 1024;
const ALLOWED_RESUME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

export async function readResumeUpload(file: File | null): Promise<PublicResumeUpload | undefined> {
  if (!file || file.size === 0) return undefined;

  const mimeType = file.type || inferResumeMimeType(file.name);
  if (!ALLOWED_RESUME_TYPES.has(mimeType)) {
    throw new Error("Upload a PDF, DOC, DOCX, or TXT resume.");
  }

  if (file.size > MAX_RESUME_BYTES) {
    throw new Error("Resume uploads must be 3 MB or smaller.");
  }

  const dataUrl = await readFileAsDataUrl(file);

  return {
    fileName: file.name,
    mimeType,
    sizeBytes: file.size,
    dataUrl: dataUrl.replace(/^data:;base64,/, `data:${mimeType};base64,`),
  };
}

export function resumeFileFromForm(form: FormData, fieldName = "resumeFile") {
  const value = form.get(fieldName);
  return value instanceof File ? value : null;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Resume upload could not be read."));
    reader.readAsDataURL(file);
  });
}

function inferResumeMimeType(fileName: string) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".doc")) return "application/msword";
  if (lowerName.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lowerName.endsWith(".txt")) return "text/plain";
  return "";
}
