export type RunStatus = "OPEN" | "LOCKED" | "SHOPPING" | "READY" | "COMPLETED" | "CANCELLED";
export type RequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "WITHDRAWN"
  | "READY"
  | "COLLECTED"
  | "UNFULFILLED"
  | "CANCELLED";
export type PaymentStatus = "UNPAID" | "RECEIVED";

export interface User {
  id: string;
  name: string;
  role: "collector" | "participant";
}

export interface ItemView {
  id: number;
  name: string;
  qty: number;
  maxPaise: number;
  actualPaise: number | null;
  skipped: boolean;
}

export interface RequestView {
  id: number;
  runId: number;
  userId: string;
  userName: string;
  status: RequestStatus;
  paymentStatus: PaymentStatus;
  note: string;
  createdAt: number;
  items: ItemView[];
  /** Only sent to the requester, once the run is ready for pickup. */
  pickupCode?: string;
  maxTotalPaise: number; // item budgets + fixed fee
  billItemsPaise: number; // sum of priced, non-skipped rows
  billFeePaise: number; // 0 if every row skipped
  billTotalPaise: number;
  pricingDone: boolean;
}

export interface RunView {
  id: number;
  shopId: string;
  shopName: string;
  category: "cafe" | "stationery";
  collectorId: string;
  collectorName: string;
  deadlineAt: number;
  returnAt: number;
  pickupPoint: string;
  capacity: number;
  feePaise: number;
  note: string;
  status: RunStatus;
  createdAt: number;
  acceptedCount: number;
  pendingCount: number;
  requests: RequestView[]; // collector: all; others: only own
}

export interface StateView {
  now: number;
  me: User;
  users: User[];
  runs: RunView[];
}
