import titleScreenImage from '../assets/title-screen.jpeg'

export default function TitleScreen({ onStart }) {
  return (
    <main className="screen title-screen">
      <div className="title-screen-art">
        <img className="title-screen-image" src={titleScreenImage} alt="" draggable={false} />
        <button
          className="title-screen-cta"
          type="button"
          aria-label="Tap to play"
          onClick={onStart}
        />
      </div>
    </main>
  )
}
