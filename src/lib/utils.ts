/** รวม className ที่มีเงื่อนไข (แบบ shadcn `cn` แต่ไม่ต้องลงแพ็กเกจเพิ่ม) */
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
