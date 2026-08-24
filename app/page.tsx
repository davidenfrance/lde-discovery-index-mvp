export default function Home() {
  return (
    <main style={{ fontFamily: "Arial, sans-serif", maxWidth: 720, margin: "40px auto", color: "#174873" }}>
      <h1>LDE Discovery Index MVP</h1>
      <p>Capability records and revocation. No wallet allow-list. Wallet ID public key is bound on each record.</p>
      <p>Burned into the wallet: locator, index public key (to detect a fake index), Wallet ID public key.</p>
      <ul>
        <li>GET /api/v1/health</li>
        <li>GET /api/v1/index-identity</li>
        <li>GET /api/v1/records</li>
        <li>POST /api/v1/records (signed with Wallet ID key)</li>
        <li>POST /api/v1/records/{"{id}"}/revoke</li>
      </ul>
      <p>Verified. Validated. Vested.</p>
    </main>
  );
}
