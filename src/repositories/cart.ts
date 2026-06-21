import { prisma } from "../db/prisma.js";

export function findByBuyerId(buyerId: string) {
  return prisma.cart.findUnique({
    where: { buyerId },
    include: {
      store: { select: { id: true, storeName: true } },
      cartItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              stock: true,
              imageUrl: true,
            },
          },
        },
        orderBy: { updatedAt: "asc" },
      },
    },
  });
}

// Called once during registration — every buyer needs a cart row.
export function createCart(buyerId: string) {
  return prisma.cart.create({ data: { buyerId } });
}

export function upsertItem(
  cartId: string,
  productId: string,
  quantity: number,
) {
  return prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    create: { cartId, productId, quantity },
    update: { quantity },
  });
}

export function updateItemQuantity(
  cartId: string,
  productId: string,
  quantity: number,
) {
  return prisma.cartItem.update({
    where: { cartId_productId: { cartId, productId } },
    data: { quantity },
  });
}

export function removeItem(cartId: string, productId: string) {
  return prisma.cartItem.delete({
    where: { cartId_productId: { cartId, productId } },
  });
}

// Sets storeId on the cart when the first item is added.
export function setStore(cartId: string, storeId: string | null) {
  return prisma.cart.update({ where: { id: cartId }, data: { storeId } });
}

// Clears all items and resets storeId — used after checkout or when buyer
// chooses to clear before switching to a different store.
export async function clearCart(tx: typeof prisma, cartId: string) {
  await tx.cartItem.deleteMany({ where: { cartId } });
  await tx.cart.update({ where: { id: cartId }, data: { storeId: null } });
}
