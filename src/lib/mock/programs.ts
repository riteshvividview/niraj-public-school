import type { Program } from "@/types";
import { MOCK_SCHOOL } from "./school";

const SEED_TIMESTAMP = "2026-06-01T00:00:00.000Z";
const schoolId = MOCK_SCHOOL.id;

export const MOCK_PROGRAMS: Program[] = [
  {
    id: "program-sports-day-2026",
    schoolId,
    title: "Annual Sports Day 2026",
    category: "sports",
    description:
      "A full day of track and field events, relay races, and house-colour competitions. Open to all students; parents welcome as spectators.",
    venue: "School Sports Ground",
    date: "2026-09-12",
    fee: 150,
    seatsTotal: 300,
    seatsAvailable: 118,
    status: "open",
    contactPhone: "+91 98765 43210",
    imageUrl: null,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: "program-science-exhibition-2026",
    schoolId,
    title: "Science & Innovation Exhibition",
    category: "exhibition",
    description:
      "Students showcase working models and projects across physics, chemistry, biology, and robotics. Certificates for top three projects per grade.",
    venue: "School Auditorium",
    date: "2026-08-22",
    fee: 100,
    seatsTotal: 200,
    seatsAvailable: 14,
    status: "filling-fast",
    contactPhone: "+91 98765 43211",
    imageUrl: null,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: "program-robotics-camp-2026",
    schoolId,
    title: "Summer Robotics Camp",
    category: "camp",
    description:
      "A five-day hands-on camp covering basic electronics, sensors, and block-based robot programming. Kits provided, no experience needed.",
    venue: "STEM Lab, Block B",
    date: "2026-05-18",
    fee: 2500,
    seatsTotal: 40,
    seatsAvailable: 0,
    status: "full",
    contactPhone: "+91 98765 43212",
    imageUrl: null,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: "program-art-workshop-2026",
    schoolId,
    title: "Weekend Art & Craft Workshop",
    category: "workshop",
    description:
      "A relaxed weekend session on watercolour painting and upcycled craft, run by the school's art faculty for grades 1 through 6.",
    venue: "Art Room, Block A",
    date: "2026-08-08",
    fee: 300,
    seatsTotal: 60,
    seatsAvailable: 45,
    status: "open",
    contactPhone: "+91 98765 43213",
    imageUrl: null,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];
