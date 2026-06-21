import sanitizeHtml from "sanitize-html";
import { AppError } from "../utils/appError.js";
import * as storeRepository from "../repositories/store.js";
import * as productRepository from "../repositories/product.js";
import { deleteProductImage } from "../middlewares/upload.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

// Sanitize free-text fields the same way we do for reviews — strip all HTML.
function sanitize(text: string): string;
function sanitize(text: undefined): undefined;
function sanitize(text?: string) {
  if (text === undefined) return undefined;

  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

// Throws 404 if the seller has no store, and returns the store.
// Used at the top of every seller product action to get the storeId
// from the authenticated sellerId without adding a separate query per controller.
async function requireSellerStore(sellerId: string) {
  const store = await storeRepository.findBySellerId(sellerId);
  if (!store) {
    throw AppError.notFound(
      "You do not have a store yet. Open one via Profile → Open Store.",
    );
  }
  return store;
}

// ─── Seller CRUD ──────────────────────────────────────────────────────────────

async function createProduct(
  sellerId: string,
  input: {
    name: string;
    description?: string;
    price: number;
    stock: number;
    imageUrl?: string;
  },
) {
  const store = await requireSellerStore(sellerId);

  return productRepository.createProduct({
    storeId: store.id,
    name: sanitize(input.name)!,
    price: input.price,
    stock: input.stock,

    ...(input.description !== undefined && {
      description: sanitize(input.description),
    }),

    ...(input.imageUrl !== undefined && {
      imageUrl: input.imageUrl,
    }),
  });
}

async function listMyProducts(
  sellerId: string,
  page: number,
  limit: number,
  search?: string,
) {
  const store = await requireSellerStore(sellerId);
  const { data, total } = await productRepository.listByStoreId(
    store.id,
    page,
    limit,
    search,
  );
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getMyProduct(sellerId: string, productId: string) {
  const store = await requireSellerStore(sellerId);
  const product = await productRepository.findOwnedById(productId, store.id);
  if (!product) throw AppError.notFound("Product not found in your store.");
  return product;
}

async function updateProduct(
  sellerId: string,
  productId: string,
  input: {
    name?: string;
    description?: string;
    price?: number;
    stock?: number;
    isActive?: boolean;
    newImageUrl?: string; // resolved from the upload middleware before entering here
  },
) {
  const updateData: {
    name?: string;
    description?: string;
    price?: number;
    stock?: number;
    imageUrl?: string;
    isActive?: boolean;
  } = {};
  if (input.name !== undefined) {
    updateData.name = sanitize(input.name)!;
  }

  if (input.description !== undefined) {
    updateData.description = sanitize(input.description)!;
  }

  if (input.price !== undefined) {
    updateData.price = input.price;
  }

  if (input.stock !== undefined) {
    updateData.stock = input.stock;
  }

  if (input.isActive !== undefined) {
    updateData.isActive = input.isActive;
  }

  if (input.newImageUrl !== undefined) {
    updateData.imageUrl = input.newImageUrl;
  }
  const store = await requireSellerStore(sellerId);
  const existing = await productRepository.findOwnedById(productId, store.id);
  if (!existing) throw AppError.notFound("Product not found in your store.");

  // If a new image was uploaded, delete the old one from Supabase (best-effort).
  if (input.newImageUrl && existing.imageUrl) {
    await deleteProductImage(existing.imageUrl);
  }

  return productRepository.updateProduct(productId, updateData);
}

async function deleteProduct(sellerId: string, productId: string) {
  const store = await requireSellerStore(sellerId);
  const existing = await productRepository.findOwnedById(productId, store.id);
  if (!existing) throw AppError.notFound("Product not found in your store.");

  // Delete image from Supabase before removing the DB row.
  if (existing.imageUrl) await deleteProductImage(existing.imageUrl);

  await productRepository.deleteProduct(productId);
  return { message: "Product deleted." };
}

export const productService = {
  createProduct,
  listMyProducts,
  getMyProduct,
  updateProduct,
  deleteProduct,
};
