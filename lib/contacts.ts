export type ContactItem = {
  icon: string;
  label: string;
  lines: string[];
  href?: string;
};

export const CONTACTS: ContactItem[] = [
  {
    icon: "bx bx-envelope",
    label: "Email",
    lines: ["smomedcicm+asrc@gmail.com"],
    href: "mailto:smomedcicm+asrc@gmail.com",
  },
  {
    icon: "bx bx-phone",
    label: "Phone",
    lines: ["+66 2 564 1000"],
    href: "tel:+6625641000",
  },
  {
    icon: "bx bx-map",
    label: "Address",
    lines: [
      "ASRC2027 CICM TU",
      "99/129 Moo 18 Phahon Yothin Rd.",
      "Khlong Nueng Subdistrict, Khlong Luang District,",
      "Pathum Thani 12120",
    ],
    href: "https://maps.app.goo.gl/HB2rNLTUrsBqNEow6",
  },
];
