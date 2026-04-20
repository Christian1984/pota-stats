export const dynamic = "force-dynamic";

import { appRouter } from "@/server/routers";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ({}),
    onError: ({ path, error }) => {
      console.error(`[tRPC] ${path}:`, error);
    },
  });

export { handler as GET, handler as POST };
