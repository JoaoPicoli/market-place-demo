import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (_request, response) => {
  const neighborhoods = await prisma.neighborhood.findMany({
    where: { city: "Curitiba", state: "PR" },
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, city: true, state: true },
  });

  response.json({ data: neighborhoods });
});

export default router;
