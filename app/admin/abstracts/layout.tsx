import AbstractAdminNav from "@/components/admin/abstract-admin-nav";

export default function AdminAbstractsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AbstractAdminNav />
      {children}
    </>
  );
}
