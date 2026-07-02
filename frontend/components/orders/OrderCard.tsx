
import Link from "next/link";
import { Order } from "@/types/order";
import OrderStatusBadge from "./OrderStatusBadge";

interface Props {
  order: Order;
}

export default function OrderCard({
  order,
}: Props) {
  return (
    <Link href={`/orders/${order.id}`}>
      <div className="rounded-xl border bg-white p-5 shadow hover:shadow-md">
        <h2 className="font-semibold">
          Order #{order.id}
        </h2>

        <div className="mt-4">
          <OrderStatusBadge
            status={order.status}
          />
        </div>
      </div>
    </Link>
  );
}
