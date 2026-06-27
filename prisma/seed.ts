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

  // Products — wipe this store's products first so re-seeding stays idempotent
  // (Product has no unique name constraint, so createMany would otherwise pile
  // up duplicates on every run).
  await prisma.product.deleteMany({ where: { storeId: store.id } });
  await prisma.product.createMany({
    data: [
      {
        storeId: store.id,
        name: "Kemeja Polos Pria",
        description: "Kemeja katun lengan panjang, nyaman dipakai harian.",
        price: 89_000,
        stock: 50,
      },
      {
        storeId: store.id,
        name: "Celana Chino Slim Fit",
        description: "Celana chino bahan stretch, tersedia banyak warna.",
        price: 150_000,
        stock: 30,
      },
      {
        storeId: store.id,
        name: "Sepatu Sneakers Putih",
        description: "Sneakers kasual, cocok untuk berbagai gaya.",
        price: 350_000,
        stock: 20,
      },
      {
        storeId: store.id,
        name: "Kaos Oversize Unisex",
        description: "Kaos cotton combed 24s, potongan oversize kekinian.",
        price: 65_000,
        stock: 80,
      },
      {
        storeId: store.id,
        name: "Jaket Hoodie Fleece",
        description: "Hoodie tebal berbahan fleece, hangat dan lembut.",
        price: 220_000,
        stock: 25,
      },
      {
        storeId: store.id,
        name: "Topi Baseball Classic",
        description: "Topi adjustable dengan bordir minimalis.",
        price: 55_000,
        stock: 100,
      },
      {
        storeId: store.id,
        name: "Tas Ransel Daypack",
        description: "Ransel 20L tahan air, banyak kompartemen.",
        price: 180_000,
        stock: 40,
      },
      {
        storeId: store.id,
        name: "Dompet Kulit Pria",
        description: "Dompet kulit sintetis premium, slim design.",
        price: 95_000,
        stock: 60,
      },
      {
        storeId: store.id,
        name: "Kemeja Flanel Kotak",
        description: "Flanel motif kotak, bahan adem dan tidak panas.",
        price: 120_000,
        stock: 35,
      },
      {
        storeId: store.id,
        name: "Celana Jeans Reguler",
        description: "Jeans denim klasik potongan reguler.",
        price: 175_000,
        stock: 28,
      },
      {
        storeId: store.id,
        name: "Sandal Slide Casual",
        description: "Sandal empuk untuk santai di rumah maupun jalan.",
        price: 45_000,
        stock: 120,
      },
      {
        storeId: store.id,
        name: "Sweater Rajut Polos",
        description: "Sweater rajut halus, cocok untuk cuaca dingin.",
        price: 160_000,
        stock: 22,
      },
      {
        storeId: store.id,
        name: "Kacamata Hitam UV400",
        description: "Kacamata anti UV dengan frame ringan.",
        price: 85_000,
        stock: 70,
      },
      {
        storeId: store.id,
        name: "Ikat Pinggang Kulit",
        description: "Sabuk kulit dengan gesper logam anti karat.",
        price: 70_000,
        stock: 65,
      },
      {
        storeId: store.id,
        name: "Kaos Kaki Sport (3 Pasang)",
        description: "Paket 3 pasang kaos kaki olahraga anti bau.",
        price: 40_000,
        stock: 150,
      },
      {
        storeId: store.id,
        name: "Jam Tangan Analog Minimalis",
        description: "Jam tangan strap kulit, desain bersih dan elegan.",
        price: 290_000,
        stock: 18,
      },
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
        reviewerRole: "BUYER",
      },
      {
        reviewerName: "Budi",
        rating: 4,
        comment: "Pilihan produk semakin banyak, bagus!",
        reviewerRole: "SELLER",
      },
      {
        reviewerName: "Sarah",
        rating: 4,
        comment: "Menu penambahan produk nya sangat mudah!",
        reviewerRole: "SELLER",
      },
      {
        reviewerName: "Bayu",
        rating: 4,
        comment: "Mantapp bisa melihat list pesanan yang sudah kita antar!",
        reviewerRole: "DRIVER",
      },
      {
        reviewerName: "Ilham",
        rating: 4,
        comment: "BANYAKK DISKONN NYA MANTAPP!",
        reviewerRole: "BUYER",
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
      note: "Pilih role saat login, ada 16 produk",
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
