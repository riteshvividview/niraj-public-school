export type AddressSource = "manual" | "live-location";

/**
 * A student's optional delivery address — the school delivers an order to it
 * when the parent can't come and collect. Mirrors the `address` group on the
 * Payload `users` collection. Either absent entirely, or complete enough to
 * deliver to (house, street, city, state, pincode).
 */
export interface Address {
  /** Flat / house number and building name. */
  house: string;
  /** Street / area / locality. */
  street: string;
  landmark?: string;
  city: string;
  state: string;
  /** 6-digit Indian PIN code. */
  pincode: string;
  /** Number the delivery person can call. */
  phone?: string;
  /** Set when the address came from "use my live location". */
  latitude?: number;
  longitude?: number;
  source?: AddressSource;
  updatedAt?: string;
}

/** The editable text fields of an address, as strings (forms). */
export interface AddressDraft {
  house: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  latitude?: number;
  longitude?: number;
  source: AddressSource;
}
