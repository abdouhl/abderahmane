export const CATEGORY_MAP: Record<string, string> = {
  "API Design":   "تصميم واجهات البرمجة",
  "Architecture": "هندسة البرمجيات",
  "CSS":          "CSS",
  "Coding":       "البرمجة",
  "Design":       "التصميم",
  "JavaScript":   "جافاسكريبت",
  "Lifestyle":    "أسلوب الحياة",
  "Personal":     "شخصي",
  "Programming":  "البرمجة",
  "Sustainability":"الاستدامة",
  "Team Culture": "ثقافة الفريق",
  "Tutorial":     "دروس تعليمية",
  "Web Dev":      "تطوير الويب",
  "جيوسياسة":    "جيوسياسة",
}

export function getCategoryAr(cat: string): string {
  return CATEGORY_MAP[cat] ?? cat
}
