import type { CartItem, Order, OrderStatus, PaymentMethod } from "@/types";
import { payloadCreate, payloadFind } from "./payload-rest";

interface PayloadOrderDoc {
  id: string;
  user: string;
  school: string;
  items: {
    kind: CartItem["kind"];
    refId: string;
    label: string;
    meta?: string | null;
    unitPrice: number;
    quantity: number;
  }[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

function toOrder(doc: PayloadOrderDoc): Order {
  return {
    id: doc.id,
    userId: doc.user,
    schoolId: doc.school,
    items: doc.items.map((item) => ({
      id: `${item.kind}-${item.refId}`,
      kind: item.kind,
      refId: item.refId,
      label: item.label,
      meta: item.meta ?? undefined,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    })),
    totalAmount: doc.totalAmount,
    paymentMethod: doc.paymentMethod,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface CreateOrderInput {
  userId: string;
  schoolId: string;
  items: CartItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
}

/** Checkout — see src/app/(frontend)/(app)/checkout/payment/page.tsx. */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const doc = await payloadCreate<PayloadOrderDoc>("orders", {
    user: input.userId,
    school: input.schoolId,
    items: input.items.map((item) => ({
      kind: item.kind,
      refId: item.refId,
      label: item.label,
      meta: item.meta,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    })),
    totalAmount: input.totalAmount,
    paymentMethod: input.paymentMethod,
    status: "paid",
  });
  return toOrder(doc);
}

/** Console — Reports Dashboard. */
export async function getOrdersBySchool(schoolId: string): Promise<Order[]> {
  const docs = await payloadFind<PayloadOrderDoc>("orders", { school: schoolId });
  return docs.map(toOrder);
}
