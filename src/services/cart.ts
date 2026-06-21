import { AppError } from "../utils/appError.js";
import { toNumber } from "../utils/money.js";
import * as cartRepository from "../repositories/cart.js";
import * as productRepository from "../repositories/product.js";

async function requireCart(buyerId: string) {
  const cart = await cartRepository.findByBuyerId(buyerId);
  if (!cart) throw AppError.notFound("Cart not found.");
  return cart;
}

async function getCart(buyerId: string) {
  const cart = await requireCart(buyerId);
  const subtotal = cart.cartItems.reduce(
    (sum: number, item: { product: { price: unknown }; quantity: number }) =>
      sum + toNumber(item.product.price) * item.quantity,
    0,
  );
  return { ...cart, subtotal: Math.round(subtotal * 100) / 100 };
}

async function addItem(buyerId: string, productId: string, quantity: number) {
  const cart = await requireCart(buyerId);

  // Load the product to get its storeId for the single-store check.
  const product = await productRepository.findPublicById(productId);
  if (!product)
    throw AppError.notFound("Product not found or is no longer available.");
  if (product.stock < quantity) {
    throw AppError.conflict(`Only ${product.stock} unit(s) available.`);
  }

  // ── Single-store enforcement ──────────────────────────────────────────────
  // This is the load-bearing rule: one cart = one store.
  // If the cart is non-empty and the incoming product belongs to a different
  // store, we reject it and tell the buyer to clear first.
  if (cart.storeId && cart.storeId !== product.storeId) {
    throw AppError.conflict(
      "Your cart already has items from another store. " +
        "Please clear your cart before adding items from a different store.",
      { currentStoreId: cart.storeId, incomingStoreId: product.storeId },
    );
  }

  // Set the store on the cart if it was empty.
  if (!cart.storeId) {
    await cartRepository.setStore(cart.id, product.storeId);
  }

  await cartRepository.upsertItem(cart.id, productId, quantity);
  return getCart(buyerId);
}

async function updateItem(
  buyerId: string,
  productId: string,
  quantity: number,
) {
  const cart = await requireCart(buyerId);
  const item = cart.cartItems.find(
    (i: { productId: string }) => i.productId === productId,
  );
  if (!item) throw AppError.notFound("Item not in cart.");

  const product = await productRepository.findPublicById(productId);
  if (product && product.stock < quantity) {
    throw AppError.conflict(`Only ${product.stock} unit(s) available.`);
  }

  await cartRepository.updateItemQuantity(cart.id, productId, quantity);
  return getCart(buyerId);
}

async function removeItem(buyerId: string, productId: string) {
  const cart = await requireCart(buyerId);
  const item = cart.cartItems.find(
    (i: { productId: string }) => i.productId === productId,
  );
  if (!item) throw AppError.notFound("Item not in cart.");

  await cartRepository.removeItem(cart.id, productId);

  // If that was the last item, reset the store lock.
  const remaining = cart.cartItems.filter(
    (i: { productId: string }) => i.productId !== productId,
  );
  if (remaining.length === 0) await cartRepository.setStore(cart.id, null);

  return getCart(buyerId);
}

async function clearCart(buyerId: string) {
  const cart = await requireCart(buyerId);
  const { prisma } = await import("../db/prisma.js");
  await cartRepository.clearCart(prisma, cart.id);
  return { message: "Cart cleared." };
}

export const cartService = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
};
