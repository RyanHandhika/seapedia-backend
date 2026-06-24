import { Role } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../src/db/prisma.js";

const PASSWORD = "Password123!";

async function upsertUserWithResources(data: {
  username: string;
  email: string;
  hash: string;
  roles: Role[];
  walletBalance: number;
}) {
  const user = await prisma.user.upsert({
    where: { username: data.username },
    update: {},
    create: {
      username: data.username,
      email: data.email,
      passwordHash: data.hash,
      userRoles: { create: data.roles.map((role) => ({ role })) },
    },
  });
  await prisma.wallet.upsert({
    where: { buyerId: user.id },
    update: {},
    create: { buyerId: user.id, balance: data.walletBalance },
  });
  await prisma.cart.upsert({
    where: { buyerId: user.id },
    update: {},
    create: { buyerId: user.id },
  });
  return user;
}

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 12);

  // Admin — no wallet/cart needed
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

  // Buyer only
  const buyer = await upsertUserWithResources({
    username: "buyer_demo",
    email: "buyer@seapedia.test",
    hash,
    roles: [Role.BUYER],
    walletBalance: 1_000_000,
  });
  await prisma.address.upsert({
    where: { id: "a1b2c3d4-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "a1b2c3d4-0000-0000-0000-000000000001",
      buyerId: buyer.id,
      label: "Rumah",
      recipientName: "Budi Buyer",
      phone: "081234567890",
      fullAddress: "Jl. Sudirman No. 1, Jakarta Pusat 10220",
      isDefault: true,
    },
  });

  // Seller + Buyer
  const seller = await upsertUserWithResources({
    username: "seller_demo",
    email: "seller@seapedia.test",
    hash,
    roles: [Role.BUYER, Role.SELLER],
    walletBalance: 500_000,
  });
  const store = await prisma.store.upsert({
    where: { sellerId: seller.id },
    update: {},
    create: {
      sellerId: seller.id,
      storeName: "Demo Toko",
      description: "Toko demo SEAPEDIA",
    },
  });
  await prisma.product.createMany({
    skipDuplicates: true,
    data: [
      {
        storeId: store.id,
        name: "Kemeja Polos Pria",
        price: 89_000,
        stock: 50,
      },
      { storeId: store.id, name: "Celana Chino", price: 150_000, stock: 30 },
      { storeId: store.id, name: "Sepatu Sneakers", price: 350_000, stock: 20 },
    ],
  });

  // Driver + Buyer
  await upsertUserWithResources({
    username: "driver_demo",
    email: "driver@seapedia.test",
    hash,
    roles: [Role.BUYER, Role.DRIVER],
    walletBalance: 0,
  });

  // Discount codes for testing
  const future = new Date("2027-12-31");
  await prisma.voucher.upsert({
    where: { code: "SAVE10" },
    update: {},
    create: {
      code: "SAVE10",
      discountType: "PERCENT",
      value: 10,
      expiryDate: future,
      usageLimit: 100,
    },
  });
  await prisma.voucher.upsert({
    where: { code: "FLAT25K" },
    update: {},
    create: {
      code: "FLAT25K",
      discountType: "FIXED",
      value: 25_000,
      expiryDate: future,
      usageLimit: 50,
    },
  });
  await prisma.promo.upsert({
    where: { code: "PROMO15" },
    update: {},
    create: {
      code: "PROMO15",
      discountType: "PERCENT",
      value: 15,
      expiryDate: future,
      description: "Promo 15% untuk semua produk",
    },
  });

  // App reviews
  await prisma.appReview.createMany({
    skipDuplicates: true,
    data: [
      {
        reviewerName: "Sari",
        rating: 5,
        comment: "Marketplace yang sangat mudah digunakan!",
      },
      {
        reviewerName: "Budi",
        rating: 4,
        comment: "Pilihan produk semakin banyak, bagus!",
      },
    ],
  });

  console.log(
    "\n✅ Seed selesai. Semua akun menggunakan password: Password123!\n",
  );
  console.table([
    {
      username: "admin",
      roles: "ADMIN",
      wallet: "-",
      note: "Login langsung, tanpa pilih role",
    },
    {
      username: "buyer_demo",
      roles: "BUYER",
      wallet: "Rp 1jt",
      note: "Login langsung, 1 alamat tersedia",
    },
    {
      username: "seller_demo",
      roles: "BUYER + SELLER",
      wallet: "Rp 500k",
      note: "Pilih role saat login, ada 3 produk",
    },
    {
      username: "driver_demo",
      roles: "BUYER + DRIVER",
      wallet: "Rp 0",
      note: "Pilih role saat login",
    },
  ]);
  console.log(
    "Discount codes: SAVE10 (10%), FLAT25K (Rp25rb), PROMO15 (15%)\n",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
