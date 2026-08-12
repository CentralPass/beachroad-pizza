import { REVIEWS } from "../lib/site-data";

const items = [
  ...REVIEWS.map((review) => ({
    title: review.quote,
    meta: `${review.author}, ${review.source}`,
    type: "review",
  })),
  {
    title: "2024 Onkaparinga Business Award winner",
    meta: "Restaurants, Bakeries and Cafés, larger business",
    type: "award",
  },
  {
    title: "2023 Onkaparinga Business Awards finalist",
    meta: "Fantastic Food and Drink",
    type: "award",
  },
];

export function ReviewRail() {
  const rail = [...items, ...items];

  return (
    <section className="review-section" aria-labelledby="community-voice-title">
      <div className="shell section-heading section-heading-light">
        <p className="eyebrow">Local voices</p>
        <h2 id="community-voice-title">Loved on Beach Road</h2>
        <p>Selected Google reviews sit beside the community-voted recognition.</p>
      </div>
      <div className="review-viewport" tabIndex={0} aria-label="Reviews and awards. Motion pauses when focused.">
        <div className="review-track">
          {rail.map((item, index) => (
            <article className={`review-card ${item.type === "award" ? "review-award" : ""}`} key={`${item.title}-${index}`}>
              <p>{item.type === "review" ? `“${item.title}”` : item.title}</p>
              <span>{item.meta}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
