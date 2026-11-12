import { createFileRoute } from "@tanstack/react-router";
import AdminLogin from "@/pages/AdminLogin.jsx";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Administrator Login — AirMate Operations" },
      {
        name: "description",
        content: "Secure restricted login for AirMate flight operations and systems administrators.",
      },
    ],
  }),
  component: AdminLogin,
});
