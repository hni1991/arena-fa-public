import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const games = await prisma.games.findMany({
  include: { /* روابط مثل participants یا profile */ },
});
