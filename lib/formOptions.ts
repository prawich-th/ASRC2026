export const PREFIXES = [
  "Dr.",
  "Prof.",
  "Assoc. Prof.",
  "Asst. Prof.",
  "Mr.",
  "Mrs.",
  "Ms.",
  "Mx.",
] as const;

export const PARTICIPANT_CATEGORIES = [
  "Medical Student",
  "Undergraduate Student",
  "Graduate Student",
  "Resident",
  "Faculty",
  "Researcher",
  "Allied Health Student",
  "Observer",
] as const;

export const MEDICAL_STUDENT_INSTITUTIONS = [
  "BM : คณะแพทยศาสตร์วชิรพยาบาล มหาวิทยาลัยนวมินทราธิราช",
  "BTU : คณะแพทยศาสตร์ มหาวิทยาลัยกรุงเทพธนบุรี",
  "BUU : คณะแพทยศาสตร์ มหาวิทยาลัยบูรพา",
  "CICM – วิทยาลัยแพทยศาสตร์นานาชาติจุฬาภรณ์",
  "CMU : คณะแพทยศาสตร์ มหาวิทยาลัยเชียงใหม่",
  "CU : คณะแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย",
  "KKU : คณะแพทยศาสตร์ มหาวิทยาลัยขอนแก่น",
  "KMITL : คณะแพทยศาสตร์ สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง",
  "KU : คณะแพทยศาสตร์ มหาวิทยาลัยเกษตรศาสตร์",
  "MFU : สำนักวิชาแพทยศาสตร์ มหาวิทยาลัยแม่ฟ้าหลวง",
  "MSU : คณะแพทยศาสตร์ มหาวิทยาลัยมหาสารคาม",
  "NU : คณะแพทยศาสตร์ มหาวิทยาลัยนเรศวร",
  "PCM : วิทยาลัยแพทยศาสตร์พระมงกุฎเกล้า",
  "PI : คณะแพทยศาสตร์ สถาบันพระบรมราชชนก",
  "PNU : คณะแพทยศาสตร์ มหาวิทยาลัยนราธิวาสราชนครินทร์",
  "PSMD : คณะแพทยศาสตร์ศรีสวางควัฒน ราชวิทยาลัยจุฬาภรณ์",
  "PSU : คณะแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์",
  "RA : คณะแพทยศาสตร์โรงพยาบาลรามาธิบดี มหาวิทยาลัยมหิดล",
  "RSU : วิทยาลัยแพทยศาสตร์ มหาวิทยาลัยรังสิต",
  "SI : คณะแพทยศาสตร์ศิริราชพยาบาล มหาวิทยาลัยมหิดล",
  "SU : คณะแพทยศาสตร์ มหาวิทยาลัยสยาม",
  "SUT : คณะแพทยศาสตร์ มหาวิทยาลัยเทคโนโลยีสุรนารี",
  "SWU : คณะแพทยศาสตร์ มหาวิทยาลัยศรีนครินทรวิโรฒ",
  "TU : คณะแพทยศาสตร์ มหาวิทยาลัยธรรมศาสตร์",
  "UBU : วิทยาลัยแพทยศาสตร์และการสาธารณสุข มหาวิทยาลัยอุบลราชธานี",
  "UP : คณะแพทยศาสตร์ มหาวิทยาลัยพะเยา",
  "VU : คณะแพทยศาสตร์ มหาวิทยาลัยวงษ์ชวลิตกุล",
  "WTU : คณะแพทยศาสตร์ มหาวิทยาลัยเวสเทิร์น วิทยาเขตวัชรพล",
  "WU : สำนักวิชาแพทยศาสตร์ มหาวิทยาลัยวลัยลักษณ์",
] as const;

export const MEDICAL_STUDENT_YEARS = ["1", "2", "3", "4", "5", "6"] as const;

export const OTHER_INSTITUTION = "Other";

export const ABSTRACT_CATEGORIES = ["oral", "poster"] as const;

export const ABSTRACT_STATUSES = [
  "draft",
  "submitted",
  "revision_requested",
  "selected",
  "rejected",
] as const;

export const USER_ROLES = [
  "staff",
  "academic_staff",
  "super_admin",
] as const;

export const ANNOUNCEMENT_TAG_TONES = [
  "primary",
  "secondary",
  "tertiary",
] as const;

export const ANNOUNCEMENT_STATUSES = ["draft", "published"] as const;

export const KEY_DATE_TONES = ["green", "orange", "red"] as const;
