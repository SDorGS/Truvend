

import { OrderStatus } from "@/types/order";

interface Props {
  status: OrderStatus;
}

export default function OrderStatusBadge({
  status,
}: Props) {
  // caution-yellow and alert-red are reserved for the listing risk system
  // (§10) and intentionally not reused here, even though "in_escrow" or
  // "disputed" might otherwise read as yellow/red states.
  const colors = {
    pending: "bg-gray-200",
    paid: "bg-teal-mid/25 text-teal-deep",
    in_escrow: "bg-teal-mid/40 text-teal-deep",
    dispatched: "bg-teal-deep/80 text-white",
    delivered: "bg-green-200",
    completed: "bg-emerald-300",
    disputed: "bg-red-300",
    cancelled: "bg-gray-400",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium ${colors[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
