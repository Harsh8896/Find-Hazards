import { useCallback, useEffect, useRef, useState } from 'react'
import correctSound from '../assets/sounds/correct.mp3'
import incorrectSound from '../assets/sounds/incorrect.mp3'
import { GAME_DURATION_SECONDS } from '../data/hazards'
import { calculateScore } from '../lib/scoring'
import { OBJECTS, highlightFor, hitTest, idForKey, loadSceneMap } from '../lib/sceneMap'
import { hitTestVector, vectorIdForKey } from '../lib/vectorHit'
import { smoothClosedPath } from '../lib/smoothPath'

const TOAST_MS = 1800

export default function GameScreen({ scene, durationSeconds, onFinish }) {
  const { HAZARDS, hazardByNum, hazardForKey } = scene
  // One tap per hazard: as many taps as there are hazards.
  const MAX_TAPS = HAZARDS.length
  const roundSeconds = durationSeconds ?? GAME_DURATION_SECONDS
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [timeLeft, setTimeLeft] = useState(roundSeconds)
  const [found, setFound] = useState(() => new Set()) // hazard numbers found
  const [foundVectorIds, setFoundVectorIds] = useState(() => new Set()) // vector shapes actually tapped
  const [wrongTaps, setWrongTaps] = useState([]) // { objectId | null, x, y } per wrong tap
  const [toast, setToast] = useState(null) // { key, text }
  const [phase, setPhase] = useState('playing') // 'playing' | 'reveal'
  const [debug, setDebug] = useState(false) // dev only: show every hazard
  const imgRef = useRef(null)
  const tapKey = useRef(0)
  // one Audio object per sound, reused every tap (cloned so rapid taps don't cut each other off)
  const correctRef = useRef(null)
  const incorrectRef = useRef(null)
  if (!correctRef.current) correctRef.current = new Audio(correctSound)
  if (!incorrectRef.current) incorrectRef.current = new Audio(incorrectSound)

  const playSound = useCallback((ref) => {
    const clip = ref.current.cloneNode()
    clip.play().catch(() => {}) // browsers may block autoplay before any user gesture; ignore
  }, [])

  const tapsUsed = found.size + wrongTaps.length
  const wrongObjectIds = [...new Set(wrongTaps.map((t) => t.objectId).filter(Boolean))]

  useEffect(() => {
    // vector scenes have no scene-labels.png to load — they become ready once the <img> itself
    // has loaded (see the onLoad handler on the board image below)
    if (scene.kind === 'vector') return
    let cancelled = false
    loadSceneMap(scene)
      .then(() => !cancelled && setReady(true))
      .catch((err) => !cancelled && setLoadError(err.message))
    return () => {
      cancelled = true
    }
  }, [scene])

  // the clock only runs once the scene is ready, and stops the moment play ends, so
  // timeLeft is the "seconds left" used for the speed bonus
  useEffect(() => {
    if (!ready || phase !== 'playing') return
    if (timeLeft <= 0) {
      setPhase('reveal')
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [ready, timeLeft, phase])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const onKey = (e) => {
      if (e.key.toLowerCase() === 'c') setDebug((d) => !d)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleTap = (e) => {
    if (!ready || phase !== 'playing') return
    // out of taps: the board stops accepting taps, but the game only ends on Submit or time-out
    if (tapsUsed >= MAX_TAPS) return

    const rect = imgRef.current.getBoundingClientRect()
    const fx = (e.clientX - rect.left) / rect.width
    const fy = (e.clientY - rect.top) / rect.height
    // tolerance scales with how big the scene is drawn: ~12 screen pixels
    const hit =
      scene.kind === 'vector'
        ? hitTestVector(scene, fx, fy, Math.round(12 * (imgRef.current.naturalWidth / rect.width)))
        : hitTest(fx, fy, Math.round(12 * (imgRef.current.naturalWidth / rect.width)))

    if (hit?.kind === 'hazard') {
      // tapping a hazard already found does not count and does not use a tap
      const hazard = hazardForKey.get(hit.key)
      if (!hazard || found.has(hazard.num)) return
      setFound((prev) => new Set(prev).add(hazard.num))
      if (scene.kind === 'vector') setFoundVectorIds((prev) => new Set(prev).add(hit.id))
      setToast({ key: ++tapKey.current, text: hazard.label })
      playSound(correctRef)
      return
    }

    // an object already marked wrong: nothing new to learn, so it doesn't use a tap
    if (hit && wrongObjectIds.includes(hit.id)) return

    setWrongTaps((prev) => [...prev, { objectId: hit?.id ?? null, x: fx, y: fy }])
    playSound(incorrectRef)
  }

  const { score, speedBonus } = calculateScore({
    correct: found.size,
    wrong: wrongTaps.length,
    secondsLeft: timeLeft,
    totalHazards: HAZARDS.length
  })

  const handleContinue = () => {
    onFinish({
      score,
      hazardsFound: found.size,
      totalHazards: HAZARDS.length,
      wrongPicks: wrongTaps.length,
      speedBonus,
      secondsLeft: timeLeft,
      timeTakenSec: roundSeconds - timeLeft,
      reason: timeLeft > 0 ? 'finished' : 'time',
      scene: scene.id
    })
  }

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')

  const isVector = scene.kind === 'vector'
  const keyToId = isVector ? (key) => vectorIdForKey(scene, key) : idForKey
  // Raster hazards can span multiple designer cut-outs; vector scenes highlight only the
  // precise polygon that was tapped, even when multiple polygons belong to one hazard.
  const foundIds = isVector
    ? [...foundVectorIds]
    : [...found].flatMap((num) => hazardByNum.get(num).keys.map(keyToId))
  const debugIds = debug
    ? isVector
      ? scene.vectorObjects
          .filter((o) => o.kind === 'hazard' && !found.has(hazardForKey.get(o.key)?.num))
          .map((o) => o.id)
      : [...OBJECTS.values()]
          .filter((o) => o.kind === 'hazard' && !found.has(hazardForKey.get(o.key)?.num))
          .map((o) => o.id)
    : []
  // a wrong tap that hit no image (bare ground, or an unlabeled thing) still needs a visible,
  // permanent mark — otherwise those wrong taps look like they never registered
  const groundMisses = wrongTaps.filter((t) => !t.objectId)

  return (
    <div className="screen game-screen">
      <div className="hud">
        <div className="hud-item">
          <span className="hud-label">Time</span>
          <span
            className={`hud-value ${timeLeft <= 15 && phase === 'playing' ? 'hud-danger' : ''}`}
          >
            {mins}:{secs}
          </span>
        </div>
        {phase === 'playing' ? (
          <>
            <div className="hud-item">
              <span className="hud-label">Found</span>
              <span className="hud-value hud-good">
                {found.size}/{HAZARDS.length}
              </span>
            </div>
            <div className="hud-item">
              <span className="hud-label">Taps</span>
              <span className="hud-value">
                {tapsUsed}/{MAX_TAPS}
              </span>
            </div>
            <button
              className="btn btn-primary hud-submit"
              onClick={() => setPhase('reveal')}
              disabled={!tapsUsed}
            >
              Submit
            </button>
          </>
        ) : (
          <>
            <div className="hud-item">
              <span className="hud-label">Found</span>
              <span className="hud-value">
                {found.size}/{HAZARDS.length}
              </span>
            </div>
            <div className="hud-item">
              <span className="hud-label">Wrong</span>
              <span className="hud-value">{wrongTaps.length}</span>
            </div>
            <div className="hud-item">
              <span className="hud-label">Bonus</span>
              <span className="hud-value">+{speedBonus}</span>
            </div>
            <div className="hud-item">
              <span className="hud-label">Score</span>
              <span className="hud-value">{score}</span>
            </div>
          </>
        )}
      </div>

      <div
        className="board-wrap"
        style={
          isVector ? { '--scene-ratio': `${scene.imageWidth} / ${scene.imageHeight}` } : undefined
        }
      >
        <img
          ref={imgRef}
          src={scene.sceneUrl}
          alt="Workplace scene: spot the hazards"
          className="board-img"
          style={scene.imageFit ? { objectFit: scene.imageFit } : undefined}
          onClick={handleTap}
          onLoad={() => isVector && setReady(true)}
          draggable={false}
        />

        {ready && (
          <div className="board-overlays" aria-hidden="true">
            {wrongObjectIds.map((id) =>
              isVector ? (
                <VectorHighlight key={`w${id}`} scene={scene} id={id} tone="bad" />
              ) : (
                <Highlight key={`w${id}`} id={id} tone="bad" />
              )
            )}
            {foundIds.map((id) =>
              isVector ? (
                <VectorHighlight key={`h${id}`} scene={scene} id={id} tone="good" />
              ) : (
                <Highlight key={`h${id}`} id={id} tone="good" />
              )
            )}
            {debugIds.map((id) =>
              isVector ? (
                <VectorHighlight key={`d${id}`} scene={scene} id={id} tone="debug" />
              ) : (
                <Highlight key={`d${id}`} id={id} tone="debug" />
              )
            )}
            {groundMisses.map((t, i) => (
              <div
                key={`m${i}`}
                className="ground-miss"
                style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%` }}
              >
                ✕
              </div>
            ))}
          </div>
        )}

        {!ready && (
          <div className="board-loading">
            {loadError ? `Could not load the scene: ${loadError}` : 'Loading scene...'}
          </div>
        )}
      </div>

      {toast && phase === 'playing' && (
        <div key={toast.key} className="found-toast">
          <span className="found-toast-check">✓</span> {toast.text}
        </div>
      )}

      {phase === 'playing' && ready && tapsUsed >= MAX_TAPS && (
        <div className="taps-out-banner">
          All {MAX_TAPS} taps used — press Submit to lock in your score
        </div>
      )}

      {debug && (
        <div className="calib-banner">Dev view — every hazard is shown. Press C to hide.</div>
      )}

      {phase === 'reveal' && (
        <div className="reveal-footer">
          <button className="btn btn-primary" onClick={handleContinue}>
            See My Result
          </button>
        </div>
      )}
    </div>
  )
}

// The designer's tinted cut-out of the tapped thing (green hazard / red object), with a glow.
function Highlight({ id, tone }) {
  const h = highlightFor(id)
  if (!h) return null
  return (
    <img src={h.src} alt="" className={`seg-glow seg-${tone}`} style={h.style} draggable={false} />
  )
}

// Vector-scene equivalent of Highlight: instead of a baked PNG cut-out, tint the tapped thing's
// actual traced outline directly with an SVG fill — no image is generated.
function VectorHighlight({ scene, id, tone }) {
  const obj = scene.vectorObjects.find((o) => o.id === id)
  if (!obj) return null
  if (obj.mask) {
    const { src, x, y, w, h } = obj.mask
    return (
      <div
        className={`vector-mask-glow vector-mask-${tone}`}
        style={{
          left: `${(x / scene.imageWidth) * 100}%`,
          top: `${(y / scene.imageHeight) * 100}%`,
          width: `${(w / scene.imageWidth) * 100}%`,
          height: `${(h / scene.imageHeight) * 100}%`,
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`
        }}
      />
    )
  }
  const d = smoothClosedPath(obj.points)
  return (
    <svg
      className="vector-glow-svg"
      viewBox={`0 0 ${scene.imageWidth} ${scene.imageHeight}`}
      preserveAspectRatio="none"
    >
      <path d={d} className={`vector-glow vector-glow-${tone}`} />
    </svg>
  )
}
