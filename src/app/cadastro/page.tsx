import { redirect } from "next/navigation";
import { RegisterTenantForm } from "@/modules/tenants/components/register-tenant-form";
import { isPlatformAdminSession } from "@/server/auth/platform-access";
import { getSession } from "@/server/auth/session";
import { Panel } from "@/shared/components/panel";

type CadastroPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CadastroPage(_props: CadastroPageProps) {
  const session = await getSession();
  const allowPlatformAccess = session ? isPlatformAdminSession(session) : false;

  if (session && !allowPlatformAccess) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-[720px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="m-auto w-full">
        <Panel>
          <RegisterTenantForm preservePlatformSession={allowPlatformAccess} />
        </Panel>
      </div>
    </main>
  );
}
