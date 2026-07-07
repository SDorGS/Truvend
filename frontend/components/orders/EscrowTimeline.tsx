import { OrderStatus } from "@/types/order";

interface Props {
  status: OrderStatus;
}

// Phase 9: `delivered` was removed as a distinct step. With code-based escrow
// release, the seller submits the buyer's delivery code and the order flips
// straight from `dispatched` to `completed` — no one triggers `delivered`,
// leaving it on the timeline would look like a stalled order forever.
const MAIN_STEPS: { key: OrderStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "paid", label: "Paid" },
  { key: "in_escrow", label: "In Escrow" },
  { key: "dispatched", label: "Dispatched" },
  { key: "completed", label: "Completed" },
];

const BRANCH_LABELS: Partial<Record<OrderStatus, string>> = {
  disputed: "Disputed",
  cancelled: "Cancelled",
};

export default function EscrowTimeline({ status }: Props) {
  const branchLabel = BRANCH_LABELS[status];
  const currentIndex = branchLabel
    ? -1 // main line is entirely "past" for a branched order
    : MAIN_STEPS.findIndex((s) => s.key === status);

  return (
    <ol className="relative flex flex-col">
      {MAIN_STEPS.map((step, index) => {
        const isPast = !branchLabel && index < currentIndex;
        const isCurrent = !branchLabel && index === currentIndex;
        const isFuture = !branchLabel && index > currentIndex;
        const isLast = index === MAIN_STEPS.length - 1;

        return (
          <li key={step.key} className="relative flex items-start gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute left-[7px] top-4 bottom-0 w-px ${
                  isFuture ? "border-l border-dashed border-gray-300" : "bg-gray-300"
                }`}
              />
            )}

            <span
              aria-hidden="true"
              className={`relative z-10 mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                isCurrent
                  ? "bg-teal-mid ring-4 ring-teal-mid/20"
                  : isPast
                    ? "bg-gray-400"
                    : branchLabel
                      ? "bg-gray-300"
                      : "border-2 border-gray-300 bg-white"
              }`}
            />

            <span
              className={`text-sm ${
                isCurrent
                  ? "font-semibold text-teal-deep"
                  : isPast || branchLabel
                    ? "text-gray-500"
                    : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}

      {branchLabel && (
        <li className="relative flex items-start gap-3 pt-2 pl-6">
          {/* Diagonal branch connector */}
          <span
            aria-hidden="true"
            className="absolute left-[7px] top-0 h-4 w-4 rounded-bl-lg border-b border-l border-alert-red/60"
          />

          <span
            aria-hidden="true"
            className="relative z-10 mt-0.5 inline-flex h-4 w-4 shrink-0 rounded-full bg-alert-red ring-4 ring-alert-red/20"
          />

          <span className="text-sm font-semibold text-alert-red">{branchLabel}</span>
        </li>
      )}
    </ol>
  );
}
