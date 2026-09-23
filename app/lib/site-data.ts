import { STATIC } from "./venue";

// Static links used by server-rendered marketing pages. Anything the owner
// manages (phone, address, hours, menu, prices, deals) comes from CentralPass;
// see venue.ts and the live components in VenueBits.tsx.
export const BUSINESS = {
  mapsUrl: STATIC.mapsUrl,
  orderUrl: "/order",
  instagramUrl: STATIC.social.instagram,
  facebookUrl: STATIC.social.facebook,
  uberUrl: STATIC.delivery.uberEats,
  doorDashUrl: STATIC.delivery.doorDash,
};

// Published hours, shown only until the live hours load or if they can't.
export const HOURS = [
  { days: "Monday to Thursday", hours: "3:00 pm to 9:00 pm" },
  { days: "Friday and Saturday", hours: "3:00 pm to 9:30 pm" },
  { days: "Sunday", hours: "3:00 pm to 9:30 pm" },
];

export const REVIEWS = [
  {
    quote: "Hot and fresh. I will definitely come back!",
    author: "Harpreet K.",
    source: "Google review",
  },
  {
    quote: "The best tasting pizzas around. Great value for money and delivered hot.",
    author: "Mick M.",
    source: "Google review",
  },
];
