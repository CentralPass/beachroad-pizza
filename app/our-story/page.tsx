import type { Metadata } from "next";
import { GALLERY } from "../lib/site-data";

export const metadata: Metadata = {
  title: "Our story",
  description:
    "Meet the small family business behind Beach Road Pizza and its community-voted Onkaparinga recognition in 2023 and 2024.",
};

export default function StoryPage() {
  return (
    <>
      <section className="story-hero">
        <div className="shell story-hero-grid">
          <div>
            <p className="eyebrow">Family owned in Christies Beach</p>
            <h1>Built from the ground up, one local order at a time.</h1>
          </div>
          <img
            src="/images/food/Beach Road Pizza_Cheesy Double.jpg"
            alt="Cheese pizza made by Beach Road Pizza"
            width="1200"
            height="680"
            fetchPriority="high"
          />
        </div>
      </section>

      <section className="story-copy-section">
        <div className="shell story-copy-grid">
          <p className="story-intro">
            Beach Road Pizza is a small family business shaped by Christies Beach and the people who keep choosing local.
          </p>
          <div className="story-prose">
            <p>
              The owner brings more than a decade in the pizza industry and the practical knowledge that comes from working every part of it. As a first-generation immigrant, building a business meant learning from the ground up, pushing through hard seasons and staying focused on the customer in front of the counter.
            </p>
            <p>
              That experience now shows up in the details: generous toppings, broad vegan choice, familiar prices and a team that understands a family dinner should feel like a treat without carrying a luxury price tag.
            </p>
            <p>
              The goal is simple. Make food people look forward to, treat customers with care and keep Beach Road Pizza connected to the community that made it possible.
            </p>
          </div>
        </div>
      </section>

      <section className="award-story" aria-labelledby="award-story-title">
        <div className="shell award-layout">
          <div>
            <p className="eyebrow">Voted by the community</p>
            <h2 id="award-story-title">From finalist to local category winner.</h2>
            <p>
              The Onkaparinga Business Awards are decided through public voting and recognise the role local businesses play across the region.
            </p>
          </div>
          <div className="award-timeline">
            <article>
              <time>2023</time>
              <h3>Onkaparinga Business Awards finalist</h3>
              <p>Restaurants, Bakeries and Cafés, larger business category.</p>
            </article>
            <article>
              <time>2024</time>
              <h3>Onkaparinga Business Award winner</h3>
              <p>Restaurants, Bakeries and Cafés, larger business category.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="photo-archive" aria-labelledby="archive-title">
        <div className="shell">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">Made here</p>
              <h2 id="archive-title">A look across the menu.</h2>
            </div>
            <p>Real Beach Road Pizza photography, from pizzas and wings to chips and loaded wedges.</p>
          </div>
          <div className="photo-grid">
            {GALLERY.map((src, index) => (
              <img
                key={src}
                src={src}
                alt={`Beach Road Pizza menu photography ${index + 1}`}
                width="760"
                height="520"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
