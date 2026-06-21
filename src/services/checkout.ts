import {
  DeliveryMethod,
  DiscountType,
  OrderStatus,
} from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";
import { AppError } from "../utils/appError.js";
import { calcCheckout, toNumber } from "../utils/money.js";
import { now } from "../utils/clock.js";
import {
  DELIVERY_FEE,
  DELIVERY_SLA_HOURS,
  PPN_RATE,
} from "../config/pricing.js";
import * as cartRepository from "../repositories/cart.js";
import * as walletRepository from "../repositories/wallet.js";
import * as addressRepository from "../repositories/address.js";
import { Prisma } from "../generated/prisma/client.js";

interface CheckoutInput {
  buyerId: string;
  addressId: string;
  deliveryMethod: DeliveryMethod;
  discountCode?: string;
}

// ── Step 1: resolve discount (voucher or promo) ───────────────────────────────
// Returns discountAmount + metadata. Full validation (expiry, usage) happens here.
async function resolveDiscount(code: string | undefined, subtotal: number) {
  if (!code)
    return {
      discountAmount: 0,
      discountType: DiscountType.NONE,
      voucherId: null,
      promoId: null,
    };

  // Try voucher first, then promo.
  const voucher = await prisma.voucher.findUnique({ where: { code } });
  if (voucher) {
    const currentDate = await now();
    if (voucher.expiryDate < currentDate)
      throw AppError.conflict("Voucher has expired.");
    if (voucher.usedCount >= voucher.usageLimit)
      throw AppError.conflict("Voucher usage limit reached.");
    const discountAmount =
      voucher.discountType === "PERCENT"
        ? subtotal * (toNumber(voucher.value) / 100)
        : toNumber(voucher.value);
    return {
      discountAmount: Math.min(discountAmount, subtotal), // can't discount more than subtotal
      discountType: DiscountType.VOUCHER,
      voucherId: voucher.id,
      promoId: null,
      voucherUsedCount: voucher.usedCount + 1,
    };
  }

  const promo = await prisma.promo.findUnique({ where: { code } });
  if (promo) {
    const currentDate = await now();
    if (promo.expiryDate < currentDate)
      throw AppError.conflict("Promo has expired.");
    const discountAmount =
      promo.discountType === "PERCENT"
        ? subtotal * (toNumber(promo.value) / 100)
        : toNumber(promo.value);
    return {
      discountAmount: Math.min(discountAmount, subtotal),
      discountType: DiscountType.PROMO,
      voucherId: null,
      promoId: promo.id,
    };
  }

  throw AppError.conflict(`Discount code "${code}" is not valid.`);
}

// ── Preview: calculate totals WITHOUT creating anything ───────────────────────
async function preview(input: CheckoutInput) {
  const cart = await cartRepository.findByBuyerId(input.buyerId);
  if (!cart || cart.cartItems.length === 0)
    throw AppError.conflict("Your cart is empty.");

  const subtotal = cart.cartItems.reduce(
    (sum: number, item: { product: { price: unknown }; quantity: number }) =>
      sum + toNumber(item.product.price) * item.quantity,
    0,
  );

  const discount = await resolveDiscount(input.discountCode, subtotal);
  const deliveryFee = DELIVERY_FEE[input.deliveryMethod];
  const totals = calcCheckout(
    subtotal,
    discount.discountAmount,
    deliveryFee,
    PPN_RATE,
  );

  return {
    ...totals,
    discountType: discount.discountType,
    deliveryMethod: input.deliveryMethod,
  };
}

// ── Confirm: atomically create order, decrement stock, deduct wallet ──────────
async function confirm(input: CheckoutInput) {
  // Pre-flight checks outside the transaction (cleaner error messages).
  const cart = await cartRepository.findByBuyerId(input.buyerId);
  if (!cart || cart.cartItems.length === 0)
    throw AppError.conflict("Your cart is empty.");
  if (!cart.storeId) throw AppError.conflict("Cart has no store associated.");

  const address = await addressRepository.findOwned(
    input.addressId,
    input.buyerId,
  );
  if (!address) throw AppError.notFound("Delivery address not found.");

  const wallet = await walletRepository.findByBuyerId(input.buyerId);
  if (!wallet) throw AppError.notFound("Wallet not found.");

  const subtotal = cart.cartItems.reduce(
    (sum: number, item: { product: { price: unknown }; quantity: number }) =>
      sum + toNumber(item.product.price) * item.quantity,
    0,
  );

  const discount = await resolveDiscount(input.discountCode, subtotal);
  const deliveryFee = DELIVERY_FEE[input.deliveryMethod];
  const totals = calcCheckout(
    subtotal,
    discount.discountAmount,
    deliveryFee,
    PPN_RATE,
  );

  if (toNumber(wallet.balance) < totals.total) {
    throw AppError.conflict(
      `Insufficient wallet balance. Your balance: Rp ${toNumber(wallet.balance).toLocaleString("id-ID")}, ` +
        `required: Rp ${totals.total.toLocaleString("id-ID")}.`,
    );
  }

  const currentTime = await now();
  const slaHours = DELIVERY_SLA_HOURS[input.deliveryMethod];
  const dueAt = new Date(currentTime.getTime() + slaHours * 60 * 60 * 1000);

  // ── The critical transaction ────────────────────────────────────────────────
  // All-or-nothing: stock decrement + wallet deduction + order creation.
  // A failure at any step rolls back everything.
  const order = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // 1. Decrement stock for each item (race-safe: conditional update).
      for (const item of cart.cartItems) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw AppError.conflict(
            `"${item.product.name}" no longer has enough stock. Please update your cart.`,
          );
        }
      }

      // 2. Create the Order with all snapshot fields.
      const newOrder = await tx.order.create({
        data: {
          buyerId: input.buyerId,
          storeId: cart.storeId!,
          addressId: input.addressId,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          discountType: discount.discountType,
          voucherId: "voucherId" in discount ? discount.voucherId : null,
          promoId: "promoId" in discount ? discount.promoId : null,
          deliveryMethod: input.deliveryMethod,
          deliveryFee: totals.deliveryFee,
          ppnAmount: totals.ppnAmount,
          total: totals.total,
          status: OrderStatus.SEDANG_DIKEMAS,
          dueAt,
          statusHistory: {
            create: {
              status: OrderStatus.SEDANG_DIKEMAS,
              note: "Order placed by buyer.",
            },
          },
        },
      });

      // 3. Create OrderItems (price snapshot — future price changes don't affect this order).
      await tx.orderItem.createMany({
        data: cart.cartItems.map(
          (item: {
            productId: string;
            quantity: number;
            product: { price: unknown };
          }) => ({
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            priceAtPurchase: toNumber(item.product.price),
          }),
        ),
      });

      // 4. Deduct wallet.
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: totals.total },
          transactions: {
            create: {
              type: "PAYMENT",
              amount: totals.total,
              description: `Payment for order #${newOrder.id.slice(-8).toUpperCase()}`,
            },
          },
        },
      });

      // 5. Increment voucher used count (if applicable).
      if (
        discount.discountType === DiscountType.VOUCHER &&
        "voucherId" in discount &&
        discount.voucherId
      ) {
        await tx.voucher.update({
          where: { id: discount.voucherId },
          data: { usedCount: { increment: 1 } },
        });
      }

      // 6. Clear cart.
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { storeId: null } });

      return newOrder;
    },
  );

  return order;
}

export const checkoutService = { preview, confirm };
