

interface Props
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  /**
   * primary: Mid Teal — default, used for most actions (forms, dispatch, confirm delivery).
   * cta: Signal Orange — reserved for actions that move money forward (Buy Now, Pay Now, Proceed Anyway).
   * neutral: gray — low-emphasis actions (Remove, Clear Cart, Go Back, Logout).
   * danger: red — destructive/warning actions unrelated to the high_risk listing signal (e.g. Raise Dispute).
   */
  variant?: "primary" | "cta" | "neutral" | "danger";
}

const VARIANT_CLASSES: Record<NonNullable<Props["variant"]>, string> = {
  primary: "bg-teal-mid hover:bg-teal-deep text-white",
  cta: "bg-signal-orange hover:brightness-90 text-white",
  neutral: "bg-gray-500 hover:bg-gray-600 text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
};

export default function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: Props) {
  return (
    <button
      {...props}
      className={`rounded-lg px-5 py-2 transition disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
