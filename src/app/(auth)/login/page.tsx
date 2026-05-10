import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; updated?: string }>;
}) {
  const params = await searchParams;
  return (
    <LoginForm
      next={params.next}
      updated={params.updated === "1"}
    />
  );
}
