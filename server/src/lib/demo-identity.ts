import { prisma } from "./prisma.js";
import { ApiError } from "./api-error.js";

const DEMO_EMAIL_SUFFIX = "@marketplace-demo.invalid";

export async function getDemoIdentity(header: string | string[] | undefined) {
  if (typeof header !== "string" || !/^\d+$/.test(header)) {
    throw new ApiError(401, "DEMO_IDENTITY_REQUIRED", "Selecione uma identidade de demonstração para continuar.");
  }

  const id = Number(header);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new ApiError(401, "INVALID_DEMO_IDENTITY", "A identidade de demonstração selecionada é inválida.");
  }

  const user = await prisma.user.findFirst({
    where: { id, isDemo: true, email: { endsWith: DEMO_EMAIL_SUFFIX } },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      providerProfile: { select: { id: true } },
    },
  });

  if (!user) {
    throw new ApiError(401, "INVALID_DEMO_IDENTITY", "A identidade de demonstração não está disponível.");
  }

  return user;
}

export type DemoIdentity = Awaited<ReturnType<typeof getDemoIdentity>>;
