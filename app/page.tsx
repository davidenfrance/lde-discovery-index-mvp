export default function Home() {
  return (
    <main style={{ fontFamily: "Arial, sans-serif", maxWidth: 720, margin: "40px auto", color: "#174873" }}>
      <h1>LDE Discovery Index MVP</h1>
      <p>Capability records and revocation. No wallet allow-list. Wallet ID public key is bound on each record.</p>
      <p>Thin list is free. Fat row needs an interrogator key. A signed receipt is the gating function (FS-GATE-1.0, stand-in 0.10, not GENIUS USD).</p>
      <ul>
        <li>GET /api/v1/health</li>
        <li>GET /api/v1/index-identity</li>
        <li>GET /api/v1/records (thin)</li>
        <li>GET /api/v1/records with X-LDEDI-Interrogator-Key (fat)</li>
        <li>POST /api/v1/gate/offer</li>
        <li>POST /api/v1/gate/accept-mvp</li>
        <li>GET /api/v1/records?gate=1&accept_id= (receipts)</li>
        <li>POST /api/v1/records (signed with Wallet ID key)</li>
        <li>POST /api/v1/records/{"{id}"}/revoke</li>
      </ul>
      <p>Verified. Validated. Vested.</p>
    </main>
  );
}
