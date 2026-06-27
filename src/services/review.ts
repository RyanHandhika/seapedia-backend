import sanitizeHtml from "sanitize-html";
import * as reviewRepository from "../repositories/review.js";
import type { Role } from "../generated/prisma/client.js";

interface SubmitReviewInput {
  reviewerName: string;
  rating: number;
  comment: string;
  userId?: string;
  reviewerRole?: Role;
}

async function submitReview(input: SubmitReviewInput) {
  const safeComment = sanitizeHtml(input.comment, {
    allowedTags: [],
    allowedAttributes: {},
  });
  const safeReviewerName = sanitizeHtml(input.reviewerName, {
    allowedTags: [],
    allowedAttributes: {},
  });

  return reviewRepository.createReview({
    reviewerName: safeReviewerName,
    rating: input.rating,
    comment: safeComment,
    ...(input.userId !== undefined ? { userId: input.userId } : {}),
    ...(input.reviewerRole !== undefined
      ? { reviewerRole: input.reviewerRole }
      : {}),
  });
}

async function listReviews(page: number, limit: number) {
  const { data, total } = await reviewRepository.listReviews(page, limit);
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export const reviewService = { submitReview, listReviews };
