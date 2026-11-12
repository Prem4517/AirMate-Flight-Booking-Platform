import CustomerDashboard from "@/components/dashboard/CustomerDashboard";
import useRequireCustomer from "@/lib/useRequireCustomer";

export default function Trips() {
  const isCustomer = useRequireCustomer("/trips");
  if (!isCustomer) return null;
  return <CustomerDashboard />;
}
