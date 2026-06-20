import { prisma } from "../db/prisma.js";

export function createReview(input: {
  reviewerName: string;
  rating: number;
  comment: string;
  userId?: string;
}) {
  return prisma.appReview.create({
    data: {
      reviewerName: input.reviewerName,
      rating: input.rating,
      comment: input.comment,
      ...(input.userId !== undefined && { userId: input.userId }),
    },
  });
}

export async function listReviews(page: number, limit: number) {
  const [data, total] = await Promise.all([
    prisma.appReview.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.appReview.count(),
  ]);
  return { data, total };
}
