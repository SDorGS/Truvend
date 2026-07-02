
interface Props {
  product: string;
  amount: number;
  buyer: string;
}

export default function SalesCard({
  product,
  amount,
  buyer,
}: Props) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <h3 className="font-semibold">
        {product}
      </h3>

      <p className="mt-2">
        Buyer: {buyer}
      </p>

      <p className="mt-3 text-xl font-bold">
        ₦{amount.toLocaleString()}
      </p>
    </div>
  );
}
