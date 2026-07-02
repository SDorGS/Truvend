

import { OrderStatus } from "@/types/order";

interface Props {
  status: OrderStatus;
}

const steps = [
  "paid",
  "in_escrow",
  "dispatched",
  "delivered",
  "completed",
];

export default function EscrowTimeline({
  status,
}: Props) {
  const current = steps.indexOf(status);

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div
          key={step}
          className="flex items-center gap-3"
        >
          <div
            className={`h-4 w-4 rounded-full ${
              index <= current
                ? "bg-teal-mid"
                : "bg-gray-300"
            }`}
          />

          <span className="capitalize">
            {step.replace("_", " ")}
          </span>
        </div>
      ))}
    </div>
  );
}
