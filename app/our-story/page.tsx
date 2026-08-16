import type { Metadata } from "next";

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
            <h1>Built from the ground up, with the community beside us.</h1>
            <p>Ten years of industry experience, one local shop and a simple promise to make every order feel worth it.</p>
          </div>
          <img
            className="page-illustration"
            src="/images/illustrations/story-community-v2.png"
            alt="Simple painted scene of a family business handing an order to a local customer"
            width="1000"
            height="1000"
            fetchPriority="high"
          />
        </div>
      </section>

      <section className="story-copy-section">
        <div className="shell story-copy-grid">
          <p className="story-intro">Small business, big local heart.</p>
          <div className="story-prose">
            <p>
              Beach Road Pizza is a small family business shaped by Christies Beach and the people who keep choosing local. The owner brings more than a decade in the pizza industry and the practical knowledge that comes from working every part of it.
            </p>
            <p>
              As a first-generation immigrant, building the business meant starting from the ground up, pushing through hard seasons and staying focused on the customer at the counter. That experience shows in generous toppings, broad choice, familiar prices and service that makes an everyday dinner feel special.
            </p>
            <p>
              The goal remains simple: make food people look forward to, treat customers with care and keep Beach Road Pizza connected to the community that made it possible.
            </p>
          </div>
        </div>
      </section>

      <section className="award-story" aria-labelledby="award-story-title">
        <div className="shell award-layout">
          <div>
            <p className="eyebrow">Voted by the community</p>
            <h2 id="award-story-title">Finalist in 2023. Winner in 2024.</h2>
            <p>The Onkaparinga Business Awards recognise local businesses through public voting.</p>
          </div>
          <div className="award-timeline">
            <article>
              <time>2023</time>
              <div><h3>Onkaparinga Business Awards finalist</h3><p>Restaurants, Bakeries and Cafés, larger business category.</p></div>
            </article>
            <article>
              <time>2024</time>
              <div><h3>Onkaparinga Business Award winner</h3><p>Restaurants, Bakeries and Cafés, larger business category.</p></div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
