import type { Payload } from "payload";
import { ALL_BOOKS } from "@/lib/mock/books";
import { MOCK_PROGRAMS } from "@/lib/mock/programs";
import { CLASS_LEVELS, MOCK_SCHOOL } from "@/lib/mock/school";
import { ALL_UNIFORM_ITEMS } from "@/lib/mock/uniform";
import { MOCK_USER_PASSWORD, MOCK_USERS } from "@/lib/mock/users";

/**
 * The actual seeding logic, shared by scripts/seed.ts (standalone — see that
 * file's header comment for a known environment issue blocking it in this
 * sandbox) and src/app/(payload)/api/seed/route.ts (a dev-only fallback that
 * runs inside Next's own server runtime instead, which doesn't hit that issue).
 */
export async function seedPayload(payload: Payload): Promise<{ schoolId: string }> {
  const school = await payload.create({
    collection: "schools",
    data: {
      name: MOCK_SCHOOL.name,
      slug: MOCK_SCHOOL.slug,
      city: MOCK_SCHOOL.city,
      state: MOCK_SCHOOL.state,
      logoUrl: MOCK_SCHOOL.logoUrl ?? undefined,
      contactPhone: MOCK_SCHOOL.contactPhone,
      contactEmail: MOCK_SCHOOL.contactEmail,
    },
  });

  const classLevelIdByMockId = new Map<string, string>();
  for (const level of CLASS_LEVELS) {
    const doc = await payload.create({
      collection: "class-levels",
      data: { school: school.id, label: level.label, board: level.board, order: level.order },
    });
    classLevelIdByMockId.set(level.id, String(doc.id));
  }

  for (const book of ALL_BOOKS) {
    await payload.create({
      collection: "books",
      data: {
        school: school.id,
        classLevel: classLevelIdByMockId.get(book.classLevelId),
        title: book.title,
        subject: book.subject,
        author: book.author,
        price: book.price,
        coverImageUrl: book.coverImageUrl ?? undefined,
        language: book.language,
        stream: book.stream,
        elective: book.elective,
      },
    });
  }

  for (const item of ALL_UNIFORM_ITEMS) {
    await payload.create({
      collection: "uniform-items",
      data: {
        school: school.id,
        classLevel: classLevelIdByMockId.get(item.classLevelId),
        name: item.name,
        category: item.category,
        description: item.description,
        sizeOptions: item.sizeOptions,
        imageUrl: item.imageUrl ?? undefined,
        gender: item.gender,
      },
    });
  }

  for (const program of MOCK_PROGRAMS) {
    await payload.create({
      collection: "programs",
      data: {
        school: school.id,
        title: program.title,
        category: program.category,
        description: program.description,
        venue: program.venue,
        date: program.date,
        fee: program.fee,
        seatsTotal: program.seatsTotal,
        seatsAvailable: program.seatsAvailable,
        status: program.status,
        contactPhone: program.contactPhone,
      },
    });
  }

  for (const user of MOCK_USERS) {
    await payload.create({
      collection: "users",
      data: {
        name: user.name,
        username: user.registerNumber,
        password: MOCK_USER_PASSWORD,
        mobileNumber: user.mobileNumber,
        role: user.role,
        school: school.id,
        classLevel: classLevelIdByMockId.get(user.classLevelId),
        preferredLanguage: user.preferredLanguage,
        section: user.section,
        gender: user.gender,
        academicLanguage: user.academicLanguage,
        languageLevel: user.languageLevel,
        stream: user.stream,
        elective: user.elective,
      },
    });
  }

  return { schoolId: String(school.id) };
}
