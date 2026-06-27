import { AppError } from "../utils/appError.js";
import { sanitizeText, sanitizeRequired } from "../utils/sanitize.js";
import * as storeRepository from "../repositories/store.js";

async function getMyStore(sellerId: string) {
  const store = await storeRepository.findBySellerId(sellerId);
  if (!store) {
    throw AppError.notFound(
      "You do not have a store yet. Go to Profile → Open Store to create one.",
    );
  }
  return store;
}

async function updateMyStore(
  sellerId: string,
  data: { storeName?: string; description?: string },
) {
  const store = await storeRepository.findBySellerId(sellerId);
  if (!store) throw AppError.notFound("Store not found.");

  const cleanName = data.storeName
    ? sanitizeRequired(data.storeName, "storeName")
    : undefined;
  const cleanDesc = sanitizeText(data.description);

  if (cleanName && cleanName !== store.storeName) {
    const conflict = await storeRepository.findByStoreName(cleanName);
    if (conflict) throw AppError.conflict("That store name is already taken.");
  }

  return storeRepository.updateStore(store.id, {
    ...(cleanName !== undefined ? { storeName: cleanName } : {}),

    ...(cleanDesc !== undefined ? { description: cleanDesc } : {}),
  });
}

async function getStoreById(storeId: string) {
  const store = await storeRepository.findById(storeId);
  if (!store) throw AppError.notFound("Store not found.");
  return store;
}

export const storeService = { getMyStore, updateMyStore, getStoreById };
