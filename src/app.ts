import express from "express";
import { prisma } from "./db";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

async function main() {
  const users = await prisma.user.findMany();
  console.log(users);
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
