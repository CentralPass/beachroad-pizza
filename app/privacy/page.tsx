import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <section className="legal-page">
      <div className="shell legal-content">
        <p className="eyebrow">Privacy</p>
        <h1>Your information stays with you.</h1>
        <p>
          This website does not send or store the details entered into the enquiry planner. The planner prepares a phone brief on your device. If online enquiry delivery is added later, this policy will be updated before personal information is collected.
        </p>
        <p>
          The optional pizza cursor setting is stored in your browser so the site remembers your preference. No advertising trackers or analytics pixels are included in this version.
        </p>
        <p>
          Ordering is handled by the Beach Road Pizza ordering platform or the delivery platform you choose. Their privacy and payment terms apply after you leave this website.
        </p>
      </div>
    </section>
  );
}
