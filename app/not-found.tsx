export default function NotFound() {
  return (
    <section className="not-found">
      <div className="shell">
        <p className="eyebrow">Page not found</p>
        <h1>That slice is no longer on the board.</h1>
        <p>Head back to the menu or return home.</p>
        <div className="button-row">
          <a className="button" href="/menu">
            View the menu
          </a>
          <a className="button button-secondary" href="/">
            Return home
          </a>
        </div>
      </div>
    </section>
  );
}
