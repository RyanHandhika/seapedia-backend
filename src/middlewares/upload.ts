import multer from "multer";
import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import path from "path";
import { supabase } from "../config/supabase.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

// Stores the file in memory (Buffer) so we can forward it to Supabase.
// We do NOT write to disk — this keeps the server stateless and works on any
// machine (no shared filesystem needed).
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(
        new AppError(
          400,
          "BAD_REQUEST",
          "Only JPEG, PNG, and WebP images are allowed",
        ),
      );
    }
    cb(null, true);
  },
});

// Express middleware: accepts an optional single "image" field.
// If no file is sent the request still passes through — image is optional
// on both product create and update.
export const parseImageField = upload.single("image");

// Uploads req.file (if present) to Supabase Storage and returns the public URL.
// Call this AFTER parseImageField runs.
export async function uploadProductImage(
  req: Request,
): Promise<string | undefined> {
  if (!req.file) return undefined;

  const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
  // Namespaced by seller id so images are easy to audit/clean up per seller.
  const filePath = `products/${req.user!.id}/${randomUUID()}${ext}`;

  const { error } = await supabase.storage
    .from(env.supabase.storage.bucket)
    .upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

  if (error) {
    // Log the Supabase error server-side but return a clean message to the client.
    console.error("[Supabase upload error]", error.message);
    throw new AppError(
      502,
      "UPLOAD_FAILED",
      "Image upload failed. Please try again.",
    );
  }

  const { data } = supabase.storage
    .from(env.supabase.storage.bucket)
    .getPublicUrl(filePath);
  return data.publicUrl;
}

// Deletes an image from Supabase given its full public URL.
// Best-effort: errors are logged but not thrown — a failed delete should not
// roll back the product update that triggered it.
export async function deleteProductImage(publicUrl: string): Promise<void> {
  try {
    // Extract the file path portion that comes after the bucket name in the URL.
    // URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const marker = `/${env.supabase.storage.bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return;
    const filePath = publicUrl.slice(idx + marker.length);
    await supabase.storage.from(env.supabase.storage.bucket).remove([filePath]);
  } catch (err) {
    console.error("[Supabase delete error]", err);
  }
}

// Convenience wrapper that runs multer then calls next() — keeps route
// definitions readable: router.post('/', parseImage, validate(...), controller)
export function parseImage(req: Request, res: Response, next: NextFunction) {
  parseImageField(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return next(new AppError(400, "BAD_REQUEST", "Image must be under 2 MB"));
    }
    if (err) return next(err);
    next();
  });
}
