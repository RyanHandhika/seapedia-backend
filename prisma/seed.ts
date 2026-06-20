import { Role } from "../src/generated/prisma/client.js";
import bcrypt from "bcrypt";
import { prisma } from "../src/db/prisma.js";

async function main() {
  const password = await bcrypt.hash("Password123!", 12);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@seapedia.test",
      passwordHash: password,
      userRoles: { create: [{ role: Role.ADMIN }] },
    },
  });

  await prisma.user.upsert({
    where: { username: "buyer_demo" },
    update: {},
    create: {
      username: "buyer_demo",
      email: "buyer@seapedia.test",
      passwordHash: password,
      userRoles: { create: [{ role: Role.BUYER }] },
    },
  });

  // Demonstrates the multi-role / active-role-selection flow.
  await prisma.user.upsert({
    where: { username: "multi_demo" },
    update: {},
    create: {
      username: "multi_demo",
      email: "multi@seapedia.test",
      passwordHash: password,
      userRoles: { create: [{ role: Role.SELLER }, { role: Role.BUYER }] },
    },
  });

  await prisma.appReview.createMany({
    data: [
      {
        reviewerName: "Sari",
        rating: 5,
        comment: "Smooth checkout experience, really easy to use.",
      },
      {
        reviewerName: "Budi",
        rating: 4,
        comment: "Good marketplace, hope more sellers join soon.",
      },
    ],
  });

  console.log("Seed complete. All demo accounts use password: Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
