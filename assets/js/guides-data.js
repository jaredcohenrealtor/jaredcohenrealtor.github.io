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
 *   description  one or two sentences shown on the guide cards
 *   pdf          file name in /assets/guides/
 *   image        optional card photo: a path in /assets/images/ WITHOUT the
 *                "-<width>.webp" ending; needs -400 and -800 versions (made by
 *                `npm run images`). Stock (Pexels) photos follow the mood-only
 *                rule in CLAUDE.md. Leave it out and the card has no photo.
 */
window.GUIDES = [
  {
    slug: "newton-transportation-guide",
    title: "Newton Transportation Guide",
    date: "2026-09-28",
    description: "Getting around Newton without a car: the Green Line D branch, commuter rail, MBTA buses, The RIDE, reduced-fare programs, MetroWest RTA, and Bluebikes.",
    pdf: "newton-transportation-guide.pdf",
    image: "places/stock-newton-centre-station"
  }
];
