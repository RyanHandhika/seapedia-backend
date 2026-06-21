import { AppError } from "../utils/appError.js";
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

  // Check name uniqueness only when the name is actually being changed.
  if (data.storeName && data.storeName !== store.storeName) {
    const conflict = await storeRepository.findByStoreName(data.storeName);
    if (conflict) throw AppError.conflict("That store name is already taken.");
  }

  return storeRepository.updateStore(store.id, data);
}

// Public: anyone can view a store by its id.
async function getStoreById(storeId: string) {
  const store = await storeRepository.findById(storeId);
  if (!store) throw AppError.notFound("Store not found.");
  return store;
}

export const storeService = { getMyStore, updateMyStore, getStoreById };
