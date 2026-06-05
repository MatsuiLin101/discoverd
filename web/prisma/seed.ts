import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

expand(config({ path: ".env.local" }));

const db = new PrismaClient();

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!username || !password) {
    console.error(
      "Error: SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD must be set in .env.local"
    );
    process.exit(1);
  }

  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`Admin user already exists: ${username}`);
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { username, password: hash, role: "ADMIN" },
  });
  console.log(`Created admin user: ${user.username}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
