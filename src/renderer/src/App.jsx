import { useEffect, useState } from 'react'
import AuthScreen from './screens/AuthScreen'
import TitleScreen from './screens/TitleScreen'
import IntroScreen from './screens/IntroScreen'
import HowToPlayScreen from './screens/HowToPlayScreen'
import GameScreen from './screens/GameScreen'
import ResultScreen from './screens/ResultScreen'
import Leaderboard from './screens/Leaderboard'
import AdminScreen from './screens/AdminScreen'
import { addPlayRecord, migrateLegacyUsers } from './lib/auth'
import { getPlayerRank } from './lib/leaderboard'
import { flushQueue, submitEntry } from './lib/sheets'
import { sceneFor, DEFAULT_SCENE_ID } from './data/scenes'
import { GAME_DURATION_SECONDS } from './data/hazards'

function App() {
  const [isLeaderboard, setIsLeaderboard] = useState(() => window.location.hash === '#leaderboard')
  const [stage, setStage] = useState('title') // 'title' | 'auth' | 'intro' | 'howto' | 'game' | 'result' | 'leaderboard' | 'admin'
  const [user, setUser] = useState(null)
  const [result, setResult] = useState(null)
  const [sceneId, setSceneId] = useState(DEFAULT_SCENE_ID) // which hazard-spotting game is active
  const [durationSeconds, setDurationSeconds] = useState(GAME_DURATION_SECONDS) // admin-set round length
  const [unlimitedWrongTaps, setUnlimitedWrongTaps] = useState(false) // admin: wrong taps don't use up taps

  useEffect(() => {
    const onHashChange = () => setIsLeaderboard(window.location.hash === '#leaderboard')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    flushQueue()
    migrateLegacyUsers()
  }, [])

  if (isLeaderboard) return <Leaderboard />

  const handleAuth = async (authedUser) => {
    setUser(authedUser)
    // picked fresh per visitor, so an admin's scene/timer change applies from the next sign-up on,
    // and in random mode each visitor gets their own randomly picked scene
    try {
      const game = await window.api.db.pickGameForPlayer()
      setSceneId(game.scene)
      setDurationSeconds(game.durationSeconds)
      setUnlimitedWrongTaps(Boolean(game.unlimitedWrongTaps))
    } catch (err) {
      console.error('Could not load game settings, using the defaults', err)
    }
    setStage('intro')
  }

  const handleFinish = async (gameResult) => {
    // the player always sees their result, even if saving it failed
    let rank = null
    let saveError = null
    try {
      await addPlayRecord(user.phone, gameResult)
      rank = await getPlayerRank(user.phone)
    } catch (err) {
      console.error('Saving the game failed', err)
      saveError = err.message
    }

    setResult({ ...gameResult, rank, saveError, synced: false, syncError: null })
    setStage('result')

    const { ok, error } = await submitEntry({
      name: user.name,
      phone: user.phone,
      email: user.email,
      company: user.company,
      designation: user.designation,
      consent: user.consent,
      score: gameResult.score,
      hazardsFound: gameResult.hazardsFound,
      totalHazards: gameResult.totalHazards,
      timeTakenSec: gameResult.timeTakenSec
    })

    setResult((r) => ({ ...r, synced: ok, syncError: ok ? null : error }))
  }

  // One visitor = one game: after the result the kiosk goes back to a fresh sign-up form.
  const handleLogout = () => {
    setUser(null)
    setResult(null)
    setStage('title')
  }

  return (
    <>
      {stage === 'title' && <TitleScreen onStart={() => setStage('auth')} />}
      {stage === 'auth' && (
        <AuthScreen
          onAuth={handleAuth}
          onLeaderboard={() => setStage('leaderboard')}
          onAdmin={() => setStage('admin')}
        />
      )}
      {stage === 'intro' && (
        <IntroScreen
          scene={sceneFor(sceneId)}
          durationSeconds={durationSeconds}
          onStart={() => setStage('howto')}
        />
      )}
      {stage === 'howto' && (
        <HowToPlayScreen
          durationSeconds={durationSeconds}
          totalHazards={sceneFor(sceneId).HAZARDS.length}
          onStart={() => setStage('game')}
          onBack={handleLogout}
        />
      )}
      {stage === 'game' && (
        <GameScreen
          scene={sceneFor(sceneId)}
          durationSeconds={durationSeconds}
          unlimitedWrongTaps={unlimitedWrongTaps}
          onFinish={handleFinish}
        />
      )}
      {stage === 'result' && user && result && (
        <ResultScreen lead={user} result={result} onDone={handleLogout} />
      )}
      {stage === 'leaderboard' && <Leaderboard onBack={() => setStage('auth')} />}
      {stage === 'admin' && <AdminScreen onExit={() => setStage('auth')} />}
    </>
  )
}

export default App
