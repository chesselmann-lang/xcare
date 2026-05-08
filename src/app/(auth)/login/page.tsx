import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return <LoginForm next={searchParams.next} />;
}
