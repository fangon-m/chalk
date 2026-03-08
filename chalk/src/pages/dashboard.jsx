import Sidebar from "../components/sidebar";

export default function Dashboard() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", position:"fixed", width: "100vw", top:0, left:0, background: "#0d0d0d" }}>

      <Sidebar />

      {/* Main content */}
      <main style={{ flex: 1, padding: "32px" }}>
        <h1 style={{ color: "white", fontFamily: "DM Mono" }}>Today</h1>
      </main>
    </div>
  )
}