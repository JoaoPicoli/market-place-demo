import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (_request, response) => {
  const categories = await prisma.category.findMany({
    where: { services: { some: { isActive: true } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, description: true },
  });

  response.json({ data: categories });
});

export default router;
