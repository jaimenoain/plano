import { AdminGuard } from "./AdminGuard";
import AdminLayout from "./AdminLayout";

export default function AdminLayoutWithGuard() {
  return (
    <AdminGuard>
      <AdminLayout />
    </AdminGuard>
  );
}

import { AdminGuard } from "./AdminGuard";
import AdminLayout from "./AdminLayout";

export default function AdminLayoutWithGuard() {
  return (
    <AdminGuard>
      <AdminLayout />
    </AdminGuard>
  );
}

