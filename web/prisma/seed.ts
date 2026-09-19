import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  // Kredensial admin TIDAK boleh ditulis di kode: repo ini publik.
  // Diambil dari environment; kalau tidak diisi, password acak dibuat sekali
  // dan dicetak ke layar agar tidak ada password default yang bisa ditebak.
  const adminUsername = process.env.ADMIN_USERNAME?.trim() || "admin";
  const envPassword = process.env.ADMIN_PASSWORD?.trim();

  const existing = await prisma.adminUser.findUnique({
    where: { email: adminUsername },
  });

  if (existing && !envPassword) {
    // Akun sudah ada dan tidak ada permintaan ganti password:
    // jangan sentuh password — supaya `npm run seed` saat update tidak
    // mereset password yang sudah diganti admin sekolah.
    console.log(`Admin "${adminUsername}" sudah ada — password dibiarkan.`);
  } else {
    const plainPassword = envPassword || randomBytes(9).toString("base64url");
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    await prisma.adminUser.upsert({
      where: { email: adminUsername },
      update: { passwordHash },
      create: {
        email: adminUsername,
        passwordHash,
        fullName: "Admin Sekolah",
      },
    });

    if (envPassword) {
      console.log(`Password admin "${adminUsername}" diperbarui.`);
    } else {
      console.log(
        `Admin dibuat — username: ${adminUsername} / password: ${plainPassword}`
      );
      console.log("Catat password ini sekarang; tidak ditampilkan lagi.");
    }
  }

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
