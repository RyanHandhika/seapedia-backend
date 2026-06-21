import { prisma } from "../db/prisma.js";

// ─── Seller queries ───────────────────────────────────────────────────────────

export function createProduct(data: {
  storeId: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  imageUrl?: string;
}) {
  return prisma.product.create({ data });
}

export async function listByStoreId(
  storeId: string,
  page: number,
  limit: number,
  search?: string,
) {
  const where = {
    storeId,
    ...(search && { name: { contains: search, mode: "insensitive" as const } }),
  };
  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);
  return { data, total };
}

export function findOwnedById(productId: string, storeId: string) {
  return prisma.product.findFirst({ where: { id: productId, storeId } });
}

export function updateProduct(
  id: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    stock?: number;
    imageUrl?: string;
    isActive?: boolean;
  },
) {
  return prisma.product.update({ where: { id }, data });
}

export function deleteProduct(id: string) {
  return prisma.product.delete({ where: { id } });
}

// ─── Public catalog queries ───────────────────────────────────────────────────

export async function listPublic(opts: {
  page: number;
  limit: number;
  search?: string;
  storeId?: string;
  minPrice?: number;
  maxPrice?: number;
}) {
  const where: Record<string, unknown> = {
    isActive: true,
    stock: { gt: 0 },
    ...(opts.search && {
      name: { contains: opts.search, mode: "insensitive" },
    }),
    ...(opts.storeId && { storeId: opts.storeId }),
    ...((opts.minPrice !== undefined || opts.maxPrice !== undefined) && {
      price: {
        ...(opts.minPrice !== undefined && { gte: opts.minPrice }),
        ...(opts.maxPrice !== undefined && { lte: opts.maxPrice }),
      },
    }),
  };

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { store: { select: { id: true, storeName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (opts.page - 1) * opts.limit,
      take: opts.limit,
    }),
    prisma.product.count({ where }),
  ]);
  return { data, total };
}

export function findPublicById(id: string) {
  return prisma.product.findFirst({
    where: { id, isActive: true },
    include: {
      store: { select: { id: true, storeName: true, description: true } },
    },
  });
}
