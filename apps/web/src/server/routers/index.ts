import { router } from "../trpc";
import { spotsRouter } from "./spots";

export const appRouter = router({
  spots: spotsRouter,
});

export type AppRouter = typeof appRouter;
