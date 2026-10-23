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
    lines: ["pr@cicmasrc.org"],
    href: "mailto:pr@cicmasrc.org",
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
