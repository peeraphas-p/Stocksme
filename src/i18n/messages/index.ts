import type { Lang } from "../config";
import { en } from "./en";
import { th, type Messages } from "./th";

/** ข้อความทุกภาษา — ใช้ฝั่ง server เท่านั้น (ฝั่งเบราว์เซอร์ได้รับเฉพาะภาษาที่เลือก) */
export const MESSAGES: Record<Lang, Messages> = { en, th };
