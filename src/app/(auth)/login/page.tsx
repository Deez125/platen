import { AccountDeletedToast } from "@/components/auth/account-deleted-toast";
import { AuthCard } from "@/components/auth/auth-card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  return (
    <>
      {deleted === "1" ? <AccountDeletedToast /> : null}
      <AuthCard initialMode="login" />
    </>
  );
}
