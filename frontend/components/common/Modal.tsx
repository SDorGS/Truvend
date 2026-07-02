
interface Props {
  open: boolean;
  children: React.ReactNode;
}

export default function Modal({
  open,
  children,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="rounded-xl bg-white p-6">
        {children}
      </div>
    </div>
  );
}
