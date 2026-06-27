import { AppError } from "../utils/appError.js";
import { sanitizeRequired, sanitizeText } from "../utils/sanitize.js";
import * as addressRepository from "../repositories/address.js";

type AddressInput = {
  label: string;
  recipientName: string;
  phone: string;
  fullAddress: string;
  isDefault?: boolean;
};

function sanitizeInput(input: Partial<AddressInput>): Partial<AddressInput> {
  const result: Partial<AddressInput> = {};

  if (input.label !== undefined) {
    result.label = sanitizeRequired(input.label, "label");
  }

  if (input.recipientName !== undefined) {
    result.recipientName = sanitizeRequired(
      input.recipientName,
      "recipientName",
    );
  }

  if (input.fullAddress !== undefined) {
    result.fullAddress = sanitizeRequired(input.fullAddress, "fullAddress");
  }

  if (input.phone !== undefined) {
    result.phone = sanitizeText(input.phone) ?? "";
  }

  if (input.isDefault !== undefined) {
    result.isDefault = input.isDefault;
  }

  return result;
}

async function list(buyerId: string) {
  return addressRepository.listByBuyerId(buyerId);
}

async function create(buyerId: string, input: AddressInput) {
  const clean = sanitizeInput(input) as AddressInput;
  const existing = await addressRepository.listByBuyerId(buyerId);
  const isDefault = existing.length === 0 ? true : (clean.isDefault ?? false);

  if (isDefault && existing.length > 0) {
    const currentDefault = existing.find(
      (a: { id: string; isDefault: boolean }) => a.isDefault,
    );
    if (currentDefault)
      await addressRepository.update(currentDefault.id, { isDefault: false });
  }

  return addressRepository.create({ buyerId, ...clean, isDefault });
}

async function update(
  buyerId: string,
  addressId: string,
  input: Partial<AddressInput>,
) {
  const existing = await addressRepository.findOwned(addressId, buyerId);
  if (!existing) throw AppError.notFound("Address not found.");

  const clean = sanitizeInput(input);
  if (clean.isDefault) await addressRepository.setDefault(addressId, buyerId);

  return addressRepository.update(addressId, clean);
}

async function remove(buyerId: string, addressId: string) {
  const existing = await addressRepository.findOwned(addressId, buyerId);
  if (!existing) throw AppError.notFound("Address not found.");
  if (existing.isDefault) {
    throw AppError.conflict(
      "Cannot delete your default address. Set another address as default first.",
    );
  }
  await addressRepository.remove(addressId);
  return { message: "Address deleted." };
}

export const addressService = { list, create, update, remove };
