
interface Props
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export default function Input(props: Props) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border p-3"
    />
  );
}
