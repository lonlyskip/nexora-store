export function displayOrderId(value) {
  const raw=String(value||"").replace(/^NX-/i,"").replace(/[^a-f0-9]/gi,"").toUpperCase();
  return raw ? "NEXORA-"+raw.slice(0,6).padEnd(6,"0") : "NEXORA-000000";
}
