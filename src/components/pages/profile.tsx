import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import UserProfile from "../auth/UserProfile";

export default function Profile() {
  return (
    <DashboardLayout>
      <UserProfile />
    </DashboardLayout>
  );
}
