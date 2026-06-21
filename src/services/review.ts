import sanitizeHtml from "sanitize-html";
import * as reviewRepository from "../repositories/review.js";

interface SubmitReviewInput {
  reviewerName: string;
  rating: number;
  comment: string;
  userId?: string;
}

// Baseline sanitization now (strip all HTML tags/attributes); the full
// XSS hardening pass with dedicated test cases is Level 7, but this is
// essentially free to do here and avoids storing raw markup at all.
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
    ...(input.userId !== undefined && {
      userId: input.userId,
    }),
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
