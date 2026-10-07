// server/scripts/users.ts
//
// Manage user accounts from the server.
//
//   npm run users -- list
//   npm run users -- create <email> <password> <MANAGER|CASHIER>
//   npm run users -- role <email> <MANAGER|CASHIER>
//   npm run users -- password <email> <new-password>
//   npm run users -- deactivate <email>
//   npm run users -- activate <email>

import "dotenv/config";

const { prisma } = await import("../src/db/prisma.js");
const users = await import("../src/services/user.service.js");

const HELP = `
Manage user accounts

  npm run users -- list
  npm run users -- create <email> <password> <MANAGER|CASHIER>
  npm run users -- role <email> <MANAGER|CASHIER>
  npm run users -- password <email> <new-password>
  npm run users -- deactivate <email>
  npm run users -- activate <email>

Roles
  MANAGER  runs the store (one active manager only)
  CASHIER  teller: POS, sales, returns, customers
`;

const [command, ...args] = process.argv.slice(2);

function need(count: number) {
  if (args.length < count) {
    console.log(HELP);
    process.exit(1);
  }
}

try {
  switch (command) {
    case "list":
      console.table(await users.listUsers());
      break;
    case "create":
      need(3);
      console.log("Created:", await users.createUser(args[0]!, args[1]!, args[2]!));
      break;
    case "role":
      need(2);
      console.log("Updated:", await users.setRole(args[0]!, args[1]!));
      break;
    case "password":
      need(2);
      await users.setPassword(args[0]!, args[1]!);
      console.log(`Password updated for ${args[0]}`);
      break;
    case "deactivate":
      need(1);
      console.log("Deactivated:", await users.setActive(args[0]!, false));
      break;
    case "activate":
      need(1);
      console.log("Activated:", await users.setActive(args[0]!, true));
      break;
    default:
      console.log(HELP);
  }
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
