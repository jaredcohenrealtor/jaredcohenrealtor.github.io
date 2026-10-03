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
 */
window.GUIDES = [
  {
    slug: "newton-transportation-guide",
    title: "Newton Transportation Guide",
    date: "2026-09-28",
    description: "Getting around Newton without a car: the Green Line D branch, commuter rail, MBTA buses, The RIDE, reduced-fare programs, MetroWest RTA, and Bluebikes.",
    pdf: "newton-transportation-guide.pdf"
  }
];
