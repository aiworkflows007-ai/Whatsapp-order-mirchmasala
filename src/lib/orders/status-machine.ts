export enum OrderStatus {
  NEW = "NEW",
  ACCEPTED = "ACCEPTED",
  PREPARING = "PREPARING",
  READY = "READY",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

/**
 * Defines the strict state transitions allowed in our Order Lifecycle:
 * 
 *   NEW ────> ACCEPTED ────> PREPARING ────> READY ────> OUT_FOR_DELIVERY ────> DELIVERED
 *    │           │
 *    │           └───> CANCELLED (Only by Admin)
 *    │
 *    └───> REJECTED
 * 
 * Additional flexible transition:
 *   - For Dine-In / Takeaway: READY can jump directly to DELIVERED (or "SERVED") without OUT_FOR_DELIVERY.
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.NEW]: [OrderStatus.ACCEPTED, OrderStatus.REJECTED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED], // Allowed direct served/delivered
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [], // Terminal state
  [OrderStatus.REJECTED]: [],  // Terminal state
  [OrderStatus.CANCELLED]: [], // Terminal state
};

/**
 * Validates whether an order status can change from previous to next.
 * 
 * @param currentStatus The active status of the order in the database
 * @param nextStatus The new status to be set
 * @returns boolean true if the change is permitted, false otherwise
 */
export function isValidStatusTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
): boolean {
  // If no change, return false (waste of query/redundant)
  if (currentStatus === nextStatus) {
    return false;
  }

  const allowedNext = VALID_TRANSITIONS[currentStatus];
  if (!allowedNext) {
    return false;
  }

  return allowedNext.includes(nextStatus);
}

/**
 * Returns a user-friendly label for a status in English/Hinglish.
 */
export function getStatusText(status: OrderStatus): { english: string; hinglish: string } {
  switch (status) {
    case OrderStatus.NEW:
      return { english: "New Order Received", hinglish: "Naya Order Mila Hai" };
    case OrderStatus.ACCEPTED:
      return { english: "Order Accepted", hinglish: "Order Accept Kar liya hai" };
    case OrderStatus.PREPARING:
      return { english: "Preparing Food", hinglish: "Rasoi me khana tayar ho raha hai" };
    case OrderStatus.READY:
      return { english: "Food is Ready", hinglish: "Khana bilkul tayar hai" };
    case OrderStatus.OUT_FOR_DELIVERY:
      return { english: "Out for Delivery", hinglish: "Rider khana lekar nikal chuka hai" };
    case OrderStatus.DELIVERED:
      return { english: "Order Delivered", hinglish: "Khana deliver ho gaya hai" };
    case OrderStatus.REJECTED:
      return { english: "Order Rejected", hinglish: "Order radd (cancel) kar diya gaya hai" };
    case OrderStatus.CANCELLED:
      return { english: "Order Cancelled", hinglish: "Order cancel ho chuka hai" };
    default:
      return { english: status, hinglish: status };
  }
}
