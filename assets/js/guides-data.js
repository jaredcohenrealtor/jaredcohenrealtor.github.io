/*
 * THE single source of truth for guide information.
 * The homepage "featured guides" section and resources.html both read this.
 *
 * To add a guide, ask Claude: /add-guide path/to/file.pdf
 * (it also creates the guide's page in /guides/ and updates sitemap.xml).
 *
 * Fields:
 *   slug         page address: /guides/<slug>.html
 *   title        guide title
 *   date         publish date, YYYY-MM-DD: the date PRINTED IN THE GUIDE
 *                (YYYY-MM when the guide prints only a month; shown as "October 2026")
 *   description  one or two sentences shown on the guide cards
 *   pdf          file name in /assets/guides/
 *   image        optional card photo: a path in /assets/images/ WITHOUT the
 *                "-<width>.webp" ending; needs -400 and -800 versions (made by
 *                `npm run images`). Stock (Pexels) photos follow the mood-only
 *                rule in CLAUDE.md. Leave it out and the card has no photo.
 */
window.GUIDES = [
  {
    slug: "first-time-buyer-guide",
    title: "First-Time Buyer Guide",
    date: "2026-10",
    description: "The key steps, forms, and deadlines for buying a first home in Massachusetts, from the first tour to keys, with Newton cost notes.",
    pdf: "first-time-buyer-guide.pdf",
    image: "photos/jared-folder-closeup"
  },
  {
    slug: "before-you-tour-guide",
    title: "Before You Tour Guide",
    date: "2026-10",
    description: "Questions to ask before you sign a buyer agreement, the Massachusetts relationship disclosure, and a showing scorecard for every home you tour.",
    pdf: "before-you-tour-guide.pdf",
    image: "photos/jared-front-walk"
  },
  {
    slug: "newton-transportation-guide",
    title: "Newton Transportation Guide",
    date: "2026-09-28",
    description: "Getting around Newton without a car: the Green Line D branch, commuter rail, MBTA buses, The RIDE, reduced-fare programs, MetroWest RTA, and Bluebikes.",
    pdf: "newton-transportation-guide.pdf",
    image: "places/stock-newton-centre-station"
  }
];
