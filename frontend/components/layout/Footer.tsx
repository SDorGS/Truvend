
import { APP_NAME } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="mt-20 border-t bg-white py-6 text-center text-gray-500">
      © {new Date().getFullYear()} {APP_NAME}
    </footer>
  );
}
