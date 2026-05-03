export const APP_VERSION = "0.1.0"

export default function HomePage() {
  return (
    <main style={{ padding: 32, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
      <h1>Foundation phase complete — see BUILD_PROGRESS.md</h1>
      <p>Build version {APP_VERSION}</p>
    </main>
  )
}
