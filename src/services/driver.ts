import { OrderStatus } from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";
import { AppError } from "../utils/appError.js";
import { toNumber } from "../utils/money.js";
import { DRIVER_EARNING_RATE } from "../config/pricing.js";
import { now } from "../utils/clock.js";
import * as driverRepository from "../repositories/driver.js";

async function listAvailableJobs(page: number, limit: number) {
  const [data, total] = await Promise.all([
    driverRepository.listAvailable(page, limit),
    driverRepository.countAvailable(),
  ]);
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getJob(jobId: string) {
  const job = await driverRepository.findByIdPublic(jobId);
  if (!job) throw AppError.notFound("Delivery job not found.");
  if (job.status !== "AVAILABLE")
    throw AppError.conflict("This job is no longer available.");
  return job;
}

async function takeJob(driverId: string, jobId: string) {
  // Ensure the driver doesn't already have an active job.
  const activeJob = await driverRepository.findActiveByDriver(driverId);
  if (activeJob) {
    throw AppError.conflict(
      "You already have an active delivery. Complete it before taking a new one.",
    );
  }

  const currentTime = await now();

  // Race-safe conditional update — same pattern as stock decrement in checkout.
  // If another driver took this job in the same millisecond, count === 0.
  const result = await prisma.deliveryJob.updateMany({
    where: { id: jobId, status: "AVAILABLE" },
    data: { status: "TAKEN", driverId, takenAt: currentTime },
  });

  if (result.count === 0) {
    throw AppError.conflict(
      "This job has already been taken by another driver.",
    );
  }

  // Update order status in a separate write (acceptable here because the job
  // row is already locked to this driver — no other driver can race past this).
  const job = await prisma.deliveryJob.findUnique({
    where: { id: jobId },
    include: { order: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: job!.orderId },
      data: { status: OrderStatus.SEDANG_DIKIRIM },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: job!.orderId,
        status: OrderStatus.SEDANG_DIKIRIM,
        note: `Picked up by driver.`,
      },
    });
  });

  // Re-fetch without the AVAILABLE status filter — the job is now TAKEN.
  return prisma.deliveryJob.findUnique({
    where: { id: jobId },
    include: {
      order: {
        select: {
          id: true,
          status: true,
          total: true,
          deliveryFee: true,
          deliveryMethod: true,
          dueAt: true,
          address: true,
          store: { select: { id: true, storeName: true } },
          buyer: { select: { id: true, username: true } },
        },
      },
    },
  });
}

async function completeJob(driverId: string, jobId: string) {
  const job = await prisma.deliveryJob.findUnique({
    where: { id: jobId },
    include: { order: true },
  });

  if (!job) throw AppError.notFound("Delivery job not found.");
  if (job.driverId !== driverId)
    throw AppError.forbidden("This job is not assigned to you.");
  if (job.status !== "TAKEN") {
    throw AppError.conflict(
      `Job is in status ${job.status} and cannot be completed.`,
    );
  }

  const currentTime = await now();
  const earning =
    Math.round(toNumber(job.order.deliveryFee) * DRIVER_EARNING_RATE * 100) /
    100;

  await prisma.$transaction(async (tx) => {
    await tx.deliveryJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED", completedAt: currentTime },
    });
    await tx.order.update({
      where: { id: job.orderId },
      data: { status: OrderStatus.PESANAN_SELESAI },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: job.orderId,
        status: OrderStatus.PESANAN_SELESAI,
        note: "Delivered.",
      },
    });
    await tx.driverEarning.create({
      data: { driverId, deliveryJobId: jobId, amount: earning },
    });
  });

  return {
    message: "Delivery completed.",
    earning,
    jobId,
    orderId: job.orderId,
  };
}

async function getActiveJob(driverId: string) {
  return driverRepository.findActiveByDriver(driverId);
}

async function getJobHistory(driverId: string, page: number, limit: number) {
  const { data, total } = await driverRepository.listHistoryByDriver(
    driverId,
    page,
    limit,
  );
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getEarnings(driverId: string, from?: Date, to?: Date) {
  return driverRepository.getEarnings(driverId, from, to);
}

export const driverService = {
  listAvailableJobs,
  getJob,
  takeJob,
  completeJob,
  getActiveJob,
  getJobHistory,
  getEarnings,
};
