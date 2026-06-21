import { AppError } from "../utils/appError.js";
import * as addressRepository from "../repositories/address.js";

type AddressInput = {
  label: string;
  recipientName: string;
  phone: string;
  fullAddress: string;
  isDefault?: boolean;
};

async function list(buyerId: string) {
  return addressRepository.listByBuyerId(buyerId);
}

async function create(buyerId: string, input: AddressInput) {
  // If this is the first address, force it to be the default.
  const existing = await addressRepository.listByBuyerId(buyerId);
  const isDefault = existing.length === 0 ? true : (input.isDefault ?? false);

  // Clear old default if we're setting a new one.
  if (isDefault && existing.length > 0) {
    const currentDefault = existing.find(
      (a: { id: string; isDefault: boolean }) => a.isDefault,
    );
    if (currentDefault)
      await addressRepository.update(currentDefault.id, { isDefault: false });
  }

  return addressRepository.create({ buyerId, ...input, isDefault });
}

async function update(
  buyerId: string,
  addressId: string,
  input: Partial<AddressInput>,
) {
  const existing = await addressRepository.findOwned(addressId, buyerId);
  if (!existing) throw AppError.notFound("Address not found.");

  if (input.isDefault) await addressRepository.setDefault(addressId, buyerId);

  return addressRepository.update(addressId, input);
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
