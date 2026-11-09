import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <h1 className="text-5xl font-extrabold text-primary">404</h1>
      <p className="text-muted-foreground">Không tìm thấy trang bạn cần.</p>
      <Link to="/" className={buttonVariants()}>
        Về trang chủ
      </Link>
    </div>
  );
}
