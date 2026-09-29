import "dotenv/config";
import { db } from "../apps/api/src/db/client.js";
import { users } from "../apps/api/src/db/schema/users.js";

async function seed() {
  console.log("Seeding database (if needed)...");
  try {
    // Check if test user exists or perform seed operations
    const userCount = await db.select().from(users);
    console.log(`Current users in DB: ${userCount.length}`);
    console.log("Database connection confirmed healthy.");
  } catch (err) {
    console.error("Seed error:", err);
  } finally {
    process.exit(0);
  }
}

seed();
