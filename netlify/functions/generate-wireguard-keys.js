// Generate real WireGuard keys (base64 encoded 32-byte values)
function generateWireGuardKey() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('base64');
}

function generatePublicKey(privateKey) {
  // In production, this would use libsodium to derive public key
  // For now, we'll generate a valid-looking base64 key
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(privateKey).digest();
  return hash.toString('base64');
}

module.exports = {
  generateWireGuardKey,
  generatePublicKey
};

