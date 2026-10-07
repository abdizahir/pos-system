import * as supplierRepository from "../repositories/supplier.repository.js";

// ============================================================
// GET ALL SUPPLIERS
// ============================================================

export async function getAllSuppliers() {
  return supplierRepository.findAll();
}

// ============================================================
// GET SUPPLIER BY ID
// ============================================================

export async function getSupplierById(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid supplier ID");
  }

  const supplier = await supplierRepository.findById(id);

  if (!supplier) {
    throw new Error("Supplier not found");
  }

  return supplier;
}

// ============================================================
// CREATE SUPPLIER
// ============================================================


export async function createSupplier(data: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}) {
  // ----------------------------------------------------------
  // Validate name
  // ----------------------------------------------------------

  const name = data.name?.trim();

  if (!name) {
    throw new Error("Supplier name is required");
  }

  // ----------------------------------------------------------
  // Check duplicate supplier name
  // ----------------------------------------------------------

  const existingSupplier = await supplierRepository.findByName(name);

  if (existingSupplier) {
    throw new Error("A supplier with this name already exists");
  }

  // ----------------------------------------------------------
  // Normalize email
  // ----------------------------------------------------------

  const email = data.email?.trim().toLowerCase();

  // ----------------------------------------------------------
  // Check duplicate email
  // ----------------------------------------------------------

  if (email) {
    const existingEmail = await supplierRepository.findByEmail(email);

    if (existingEmail) {
      throw new Error("A supplier with this email already exists");
    }
  }

  // ----------------------------------------------------------
  // Prepare supplier data
  // ----------------------------------------------------------

  const supplierData: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  } = {
    name,
  };

  if (email) {
    supplierData.email = email;
  }

  const phone = data.phone?.trim();

  if (phone) {
    supplierData.phone = phone;
  }

  const address = data.address?.trim();

  if (address) {
    supplierData.address = address;
  }

  // ----------------------------------------------------------
  // Create supplier
  // ----------------------------------------------------------

  return supplierRepository.create(supplierData);
}


// ============================================================
// UPDATE SUPPLIER
// ============================================================

export async function updateSupplier(
  id: number,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  }
) {
  // ----------------------------------------------------------
  // Validate ID
  // ----------------------------------------------------------

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid supplier ID");
  }

  // ----------------------------------------------------------
  // Check supplier exists
  // ----------------------------------------------------------

  const existingSupplier = await supplierRepository.findById(id);

  if (!existingSupplier) {
    throw new Error("Supplier not found");
  }

  // ----------------------------------------------------------
  // Prepare update data
  // ----------------------------------------------------------

  const updateData: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  } = {};

  // ----------------------------------------------------------
  // Name
  // ----------------------------------------------------------

  if (data.name !== undefined) {
    const name = data.name.trim();

    if (!name) {
      throw new Error("Supplier name cannot be empty");
    }

    // Check duplicate name only if changed
    if (
      name.toLowerCase() !==
      existingSupplier.name.toLowerCase()
    ) {
      const supplierWithSameName =
        await supplierRepository.findByName(name);

      if (
        supplierWithSameName &&
        supplierWithSameName.id !== id
      ) {
        throw new Error(
          "A supplier with this name already exists"
        );
      }
    }

    updateData.name = name;
  }

  // ----------------------------------------------------------
  // Email
  // ----------------------------------------------------------

  if (data.email !== undefined) {
    const email = data.email.trim().toLowerCase();

    if (email) {
      const supplierWithSameEmail =
        await supplierRepository.findByEmail(email);

      if (
        supplierWithSameEmail &&
        supplierWithSameEmail.id !== id
      ) {
        throw new Error(
          "A supplier with this email already exists"
        );
      }

      updateData.email = email;
    } else {
      updateData.email = "";
    }
  }

  // ----------------------------------------------------------
  // Phone
  // ----------------------------------------------------------

  if (data.phone !== undefined) {
    updateData.phone = data.phone.trim();
  }

  // ----------------------------------------------------------
  // Address
  // ----------------------------------------------------------

  if (data.address !== undefined) {
    updateData.address = data.address.trim();
  }

  // ----------------------------------------------------------
  // Update supplier
  // ----------------------------------------------------------

  return supplierRepository.update(id, updateData);
}

// ============================================================
// DELETE SUPPLIER
// ============================================================

export async function deleteSupplier(id: number) {
  // ----------------------------------------------------------
  // Validate ID
  // ----------------------------------------------------------

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid supplier ID");
  }

  // ----------------------------------------------------------
  // Check supplier exists
  // ----------------------------------------------------------

  const supplier = await supplierRepository.findById(id);

  if (!supplier) {
    throw new Error("Supplier not found");
  }

  // ----------------------------------------------------------
  // Prevent deleting suppliers with purchase history
  // ----------------------------------------------------------

  if (supplier.purchases.length > 0) {
    throw new Error(
      "Cannot delete a supplier with purchase history"
    );
  }

  // ----------------------------------------------------------
  // Prevent deleting suppliers with stock history
  // ----------------------------------------------------------

  if (supplier.stockBatches.length > 0) {
    throw new Error(
      "Cannot delete a supplier with stock history"
    );
  }

  // ----------------------------------------------------------
  // Delete supplier
  // ----------------------------------------------------------

  return supplierRepository.remove(id);
}