export default function IntroScreen({ scene, durationSeconds, onStart }) {
  const totalHazards = scene.HAZARDS.length

  return (
    <main className="screen intro-screen">
      <div
        className="intro-backdrop"
        style={{ backgroundImage: `url("${scene.sceneUrl}")` }}
        aria-hidden="true"
      />
      <div className="intro-shade" aria-hidden="true" />

      <header className="intro-brand" aria-label="PIP Global Safety">
        <span className="intro-brand-name">PIP</span>
        <span className="intro-brand-sub">Global Safety</span>
      </header>

      <section className="intro-content">
        <div className="intro-copy">
          <p className="intro-eyebrow">{scene.label} safety challenge</p>
          <p className="intro-count">{totalHazards} hazards are hiding in this scene.</p>
          <h1 className="intro-title">
            <span>Spot the</span>
            <strong>Hazards</strong>
          </h1>
          <p className="intro-prompt">
            How many can you find in <strong>{durationSeconds} seconds?</strong>
          </p>
          <button className="intro-cta" type="button" onClick={onStart}>
            <span>Tap to play</span>
            <span className="intro-arrows" aria-hidden="true">
              ›››
            </span>
          </button>
          <p className="intro-hint">Next up: a quick guide, then your challenge begins.</p>
        </div>

        <div className="intro-lens-wrap" aria-hidden="true">
          <div className="intro-lens">
            <img src={scene.sceneUrl} alt="" draggable={false} />
          </div>
          <div className="intro-lens-handle" />
        </div>
      </section>

      <footer className="intro-footer">
        <span className="intro-footer-stripes" aria-hidden="true">
          ///
        </span>
        <span>Find the hazards. Make every tap count.</span>
        <span className="intro-footer-stat">
          {totalHazards} hazards <i /> {durationSeconds} seconds
        </span>
      </footer>
    </main>
  )
}
