import type { Gender, UniformItem } from "@/types";
import { MOCK_SCHOOL } from "./school";

const SEED_TIMESTAMP = "2026-06-01T00:00:00.000Z";
const schoolId = MOCK_SCHOOL.id;

/**
 * The school's real uniform bundle sheet (Final Uniforms Cost-26-27...xlsx)
 * gives one fixed price per garment LINE — already the total for that
 * line's "Fixed Pcs" quantity, not a per-piece price — so each line becomes
 * a single-size catalog item priced at that line total (quantity folded into
 * the name/price rather than modeled as a separate field). No
 * per-physical-size price variation exists in the source data, so
 * sizeOptions is just one row.
 */
function realUniformItem(
  id: string,
  classLevelId: string,
  gender: Gender,
  name: string,
  category: "uniform" | "kit",
  price: number,
): UniformItem {
  return {
    id,
    schoolId,
    classLevelId,
    name,
    category,
    imageUrl: null,
    sizeOptions: [{ size: "Standard", price }],
    gender,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  };
}

export const CLASS_2_UNIFORM_ITEMS: UniformItem[] = [
  // Girls I to V
  realUniformItem("uniform-class2-girls-shirt", "class-2", "female", "NIR Uni Placket Trim Shirt - Sky (Set of 2)", "uniform", 1100),
  realUniformItem("uniform-class2-girls-skirt", "class-2", "female", "RAP Girls 3 Pleat KE Skirt - Hunter (Set of 2)", "uniform", 1380),
  realUniformItem("uniform-class2-girls-cycling-shorts", "class-2", "female", "RAP Girls Cycling Shorts - Black (Set of 2)", "uniform", 450),
  realUniformItem("uniform-class2-girls-tee", "class-2", "female", "NIR Uni V Slate Tee - 4 Colors (Set of 2)", "uniform", 1080),
  realUniformItem("uniform-class2-girls-knit-shorts", "class-2", "female", "RAP Uni SD Knit In Shorts - Black (Set of 2)", "uniform", 1050),
  realUniformItem("uniform-class2-girls-hoody", "class-2", "female", "NIR Uni FS Puff Hoody - Camo", "kit", 1775),
  realUniformItem("uniform-class2-girls-belt", "class-2", "female", "NIR Uni Insert Belt - Grn/Blk", "kit", 240),
  realUniformItem("uniform-class2-girls-reg-socks", "class-2", "female", "NIR Regular Socks (Set of 2)", "kit", 200),
  realUniformItem("uniform-class2-girls-sports-socks", "class-2", "female", "NIR Sports Socks (Set of 2)", "kit", 200),

  // Boys I to V
  realUniformItem("uniform-class2-boys-shirt", "class-2", "male", "NIR Uni Placket Trim Shirt - Sky (Set of 2)", "uniform", 1100),
  realUniformItem("uniform-class2-boys-cargo-shorts", "class-2", "male", "RAP Boys KE Cargo Shorts - Hunter (Set of 2)", "uniform", 1170),
  realUniformItem("uniform-class2-boys-tee", "class-2", "male", "NIR Uni V Slate Tee - 4 Colors (Set of 2)", "uniform", 1080),
  realUniformItem("uniform-class2-boys-knit-shorts", "class-2", "male", "RAP Uni SD Knit In Shorts - Black (Set of 2)", "uniform", 1050),
  realUniformItem("uniform-class2-boys-hoody", "class-2", "male", "NIR Uni FS Puff Hoody - Camo", "kit", 1775),
  realUniformItem("uniform-class2-boys-belt", "class-2", "male", "NIR Uni Insert Belt - Grn/Blk", "kit", 240),
  realUniformItem("uniform-class2-boys-reg-socks", "class-2", "male", "NIR Regular Socks (Set of 2)", "kit", 200),
  realUniformItem("uniform-class2-boys-sports-socks", "class-2", "male", "NIR Sports Socks (Set of 2)", "kit", 200),
];

export const CLASS_8_UNIFORM_ITEMS: UniformItem[] = [
  // Girls VI to XI
  realUniformItem("uniform-class8-girls-shirt", "class-8", "female", "NIR Uni Side Trim Shirt - White (Set of 2)", "uniform", 1270),
  realUniformItem("uniform-class8-girls-pants", "class-8", "female", "RAP Uni EW Cargo Pants - Hunter (Set of 2)", "uniform", 2150),
  realUniformItem("uniform-class8-girls-waistcoat", "class-8", "female", "NIR Sr. Girls Waistcoat - Coffee/Hunter", "uniform", 600),
  realUniformItem("uniform-class8-girls-tee", "class-8", "female", "NIR Uni V Slate Tee - 4 Colors (Set of 2)", "uniform", 1080),
  realUniformItem("uniform-class8-girls-track", "class-8", "female", "RAP Uni SD Piping Track - Black (Set of 2)", "uniform", 1330),
  realUniformItem("uniform-class8-girls-hoody", "class-8", "female", "NIR Uni FS Puff Hoody - Camo", "kit", 1775),
  realUniformItem("uniform-class8-girls-belt", "class-8", "female", "NIR Uni Insert Belt - Grn/Blk", "kit", 240),
  realUniformItem("uniform-class8-girls-reg-socks", "class-8", "female", "NIR Regular Socks (Set of 2)", "kit", 200),
  realUniformItem("uniform-class8-girls-sports-socks", "class-8", "female", "NIR Sports Socks (Set of 2)", "kit", 200),

  // Boys VI to XI
  realUniformItem("uniform-class8-boys-shirt", "class-8", "male", "NIR Uni Side Trim Shirt - White (Set of 2)", "uniform", 1270),
  realUniformItem("uniform-class8-boys-pants", "class-8", "male", "RAP Uni EW Cargo Pants - Hunter (Set of 2)", "uniform", 2150),
  realUniformItem("uniform-class8-boys-tee", "class-8", "male", "NIR Uni V Slate Tee - 4 Colors (Set of 2)", "uniform", 1080),
  realUniformItem("uniform-class8-boys-track", "class-8", "male", "RAP Uni SD Piping Track - Black (Set of 2)", "uniform", 1330),
  realUniformItem("uniform-class8-boys-hoody", "class-8", "male", "NIR Uni FS Puff Hoody - Camo", "kit", 1775),
  realUniformItem("uniform-class8-boys-belt", "class-8", "male", "NIR Uni Insert Belt - Grn/Blk", "kit", 240),
  realUniformItem("uniform-class8-boys-reg-socks", "class-8", "male", "NIR Regular Socks (Set of 2)", "kit", 200),
  realUniformItem("uniform-class8-boys-sports-socks", "class-8", "male", "NIR Sports Socks (Set of 2)", "kit", 200),
];

export const ALL_UNIFORM_ITEMS: UniformItem[] = [...CLASS_2_UNIFORM_ITEMS, ...CLASS_8_UNIFORM_ITEMS];
