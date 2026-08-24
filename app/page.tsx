export default function Home() {
  return (
    <main style={{ fontFamily: "Arial, sans-serif", maxWidth: 720, margin: "40px auto", color: "#174873" }}>
      <h1>LDE Discovery Index MVP</h1>
      <p>This host stores capability records and applies revocation. Revoked records are not returned on later queries.</p>
      <p>Not on this host: Discovery Index Locator, pinned keys, First Service identity.</p>
      <ul>
        <li>GET /api/v1/health</li>
        <li>GET /api/v1/records</li>
        <li>POST /api/v1/records (signed MVP Wallet AI)</li>
        <li>POST /api/v1/records/{"{id}"}/revoke (signed)</li>
      </ul>
      <p>Verified. Validated. Vested.</p>
    </main>
  );
}
