import { lineId } from "@/store/cart-store";
import type { Book, CartItem, StationeryItem, UniformItem } from "@/types";

/**
 * Book/StationeryItem/UniformItem -> CartItem mappers, shared by the
 * essentials hub and its three sub-pages so "what a cart line looks like
 * for this catalogue item" is defined once.
 */
export function bookToCartItem(book: Book): CartItem {
  return {
    id: lineId("book", book.id),
    kind: "book",
    refId: book.id,
    label: book.title,
    meta: book.subject,
    unitPrice: book.price,
    quantity: 1,
  };
}

export function stationeryToCartItem(item: StationeryItem): CartItem {
  return {
    id: lineId("stationery", item.id),
    kind: "stationery",
    refId: item.id,
    label: item.name,
    meta: item.quantityLabel,
    unitPrice: item.price,
    quantity: 1,
  };
}

export function uniformToCartItem(item: UniformItem, size: string, price: number): CartItem {
  return {
    id: lineId("uniform", item.id),
    kind: "uniform",
    refId: item.id,
    label: item.name,
    meta: size,
    unitPrice: price,
    quantity: 1,
  };
}
