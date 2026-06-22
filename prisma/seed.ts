import { Role } from "../src/generated/prisma/client";
import { prisma } from "../src/db/prisma";
import bcrypt from "bcrypt";

const PASSWORD = "Password123!";

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 12);

  // Admin (seed-only, no wallet/cart needed)
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@seapedia.test",
      passwordHash: hash,
      userRoles: { create: [{ role: Role.ADMIN }] },
    },
  });

  // Pure buyer
  const buyer = await prisma.user.upsert({
    where: { username: "buyer_demo" },
    update: {},
    create: {
      username: "buyer_demo",
      email: "buyer@seapedia.test",
      passwordHash: hash,
      userRoles: { create: [{ role: Role.BUYER }] },
    },
  });
  await prisma.wallet.upsert({
    where: { buyerId: buyer.id },
    update: {},
    create: { buyerId: buyer.id, balance: 500_000 },
  });
  await prisma.cart.upsert({
    where: { buyerId: buyer.id },
    update: {},
    create: { buyerId: buyer.id },
  });
  await prisma.address
    .create({
      data: {
        buyerId: buyer.id,
        label: "Rumah",
        recipientName: "Budi Buyer",
        phone: "081234567890",
        fullAddress: "Jl. Sudirman No. 1, Jakarta Pusat",
        isDefault: true,
      },
    })
    .catch(() => {}); // ignore if already exists

  // Multi-role: Buyer + Seller
  const seller = await prisma.user.upsert({
    where: { username: "seller_demo" },
    update: {},
    create: {
      username: "seller_demo",
      email: "seller@seapedia.test",
      passwordHash: hash,
      userRoles: { create: [{ role: Role.BUYER }, { role: Role.SELLER }] },
    },
  });
  await prisma.wallet.upsert({
    where: { buyerId: seller.id },
    update: {},
    create: { buyerId: seller.id, balance: 1_000_000 },
  });
  await prisma.cart.upsert({
    where: { buyerId: seller.id },
    update: {},
    create: { buyerId: seller.id },
  });
  await prisma.store.upsert({
    where: { sellerId: seller.id },
    update: {},
    create: {
      sellerId: seller.id,
      storeName: "Demo Toko",
      description: "Seeded demo store",
    },
  });

  // Multi-role: Buyer + Driver
  const driver = await prisma.user.upsert({
    where: { username: "driver_demo" },
    update: {},
    create: {
      username: "driver_demo",
      email: "driver@seapedia.test",
      passwordHash: hash,
      userRoles: { create: [{ role: Role.BUYER }, { role: Role.DRIVER }] },
    },
  });
  await prisma.wallet.upsert({
    where: { buyerId: driver.id },
    update: {},
    create: { buyerId: driver.id, balance: 0 },
  });
  await prisma.cart.upsert({
    where: { buyerId: driver.id },
    update: {},
    create: { buyerId: driver.id },
  });

  // Seed some demo products
  const demoStore = await prisma.store.findUnique({
    where: { sellerId: seller.id },
  });
  if (demoStore) {
    await prisma.product.createMany({
      skipDuplicates: true,
      data: [
        {
          storeId: demoStore.id,
          name: "Kemeja Polos Pria",
          description: "Tersedia berbagai warna",
          price: 89_000,
          stock: 50,
        },
        {
          storeId: demoStore.id,
          name: "Celana Chino",
          description: "Bahan premium nyaman dipakai",
          price: 150_000,
          stock: 30,
        },
        {
          storeId: demoStore.id,
          name: "Sepatu Sneakers",
          description: "Ringan dan stylish",
          price: 350_000,
          stock: 20,
        },
      ],
    });
  }

  await prisma.appReview.createMany({
    skipDuplicates: true,
    data: [
      { reviewerName: "Sari", rating: 5, comment: "Belanja mudah dan cepat!" },
      {
        reviewerName: "Budi",
        rating: 4,
        comment: "Pilihan produk semakin banyak.",
      },
    ],
  });

  console.log("\nSeed complete. All accounts use password: Password123!\n");
  console.table([
    { username: "admin", roles: "ADMIN", wallet: "-", note: "Admin only" },
    {
      username: "buyer_demo",
      roles: "BUYER",
      wallet: "Rp 500k",
      note: "Single-role login",
    },
    {
      username: "seller_demo",
      roles: "BUYER + SELLER",
      wallet: "Rp 1jt",
      note: "Role selection on login",
    },
    {
      username: "driver_demo",
      roles: "BUYER + DRIVER",
      wallet: "Rp 0",
      note: "Role selection on login",
    },
  ]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
