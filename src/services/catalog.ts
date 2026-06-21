import { AppError } from "../utils/appError.js";
import * as productRepository from "../repositories/product.js";
import * as storeRepository from "../repositories/store.js";
import * as productRepoFull from "../repositories/product.js";

async function listProducts(opts: {
  page: number;
  limit: number;
  search?: string;
  storeId?: string;
  minPrice?: number;
  maxPrice?: number;
}) {
  const { data, total } = await productRepository.listPublic(opts);
  return {
    data,
    pagination: {
      page: opts.page,
      limit: opts.limit,
      total,
      totalPages: Math.ceil(total / opts.limit),
    },
  };
}

async function getProduct(productId: string) {
  const product = await productRepository.findPublicById(productId);
  if (!product) throw AppError.notFound("Product not found.");
  return product;
}

async function getStore(storeId: string) {
  const store = await storeRepository.findById(storeId);
  if (!store) throw AppError.notFound("Store not found.");

  // Show only active, in-stock products on the public store page.
  const { data: products } = await productRepoFull.listPublic({
    page: 1,
    limit: 20,
    storeId,
  });

  return { store, products };
}

export const catalogService = { listProducts, getProduct, getStore };
