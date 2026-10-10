import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (_request, response) => {
  const users = await prisma.user.findMany({
    where: { isDemo: true, email: { endsWith: "@marketplace-demo.invalid" } },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      providerProfile: { select: { id: true } },
    },
  });

  response.json({
    data: users.map((user) => ({
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      providerProfileId: user.providerProfile?.id ?? null,
    })),
  });
});

export default router;
