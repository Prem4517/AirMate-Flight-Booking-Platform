import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { sanitizeRedirect } from "@/lib/authRedirect";

export default function useRequireCustomer(redirect) {
  const { user, authLoading } = useStore();
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location });

  useEffect(() => {
    if (!authLoading && !user) {
      const current = `${location.pathname}${location.searchStr || ""}`;
      navigate({
        to: "/auth",
        search: { redirect: sanitizeRedirect(redirect || current) },
        replace: true,
      });
    }
  }, [authLoading, location.pathname, location.searchStr, navigate, redirect, user]);

  return !authLoading && Boolean(user);
}
