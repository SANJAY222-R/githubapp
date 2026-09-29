import crypto from "crypto";

const tokenKey = crypto.randomBytes(32).toString("base64");
const sessionSecret = crypto.randomBytes(32).toString("hex");

console.log("=== Generated Secrets ===");
console.log(`TOKEN_ENCRYPTION_KEY=${tokenKey}`);
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log("=========================");
