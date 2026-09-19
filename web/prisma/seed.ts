import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("smada02", 10);

  await prisma.adminUser.upsert({
    where: { email: "smada" },
    update: {
      passwordHash,
      fullName: "Admin Sekolah",
    },
    create: {
      email: "smada",
      passwordHash,
      fullName: "Admin Sekolah",
    },
  });

  const students = [
    {
      nis: "0012345671",
      fullName: "Jane Doe",
      grade: "10",
      class: "IPA 1",
      parentName: "John Doe",
      parentPhone: "081234567890",
      parentEmail: "john.doe@example.com",
    },
    {
      nis: "0012345672",
      fullName: "Ahmad Fauzi",
      grade: "11",
      class: "IPS 2",
      parentName: "Siti Aminah",
      parentPhone: "081298765432",
      parentEmail: null,
    },
    {
      nis: "0012345673",
      fullName: "Siti Nurhaliza",
      grade: "9",
      class: "A",
      parentName: null,
      parentPhone: null,
      parentEmail: null,
    },
  ];

  for (const s of students) {
    await prisma.student.upsert({
      where: { nis: s.nis },
      update: {},
      create: s,
    });
  }

  console.log("Seed selesai. Akun admin siap digunakan.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
