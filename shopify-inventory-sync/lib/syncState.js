/** In-memory sync metadata (best-effort on serverless warm instances). */
let lastSync = null;

function recordSync(result, source = "manual") {
  lastSync = {
    at: new Date().toISOString(),
    source,
    result,
  };
  return lastSync;
}

function getLastSync() {
  return lastSync;
}

module.exports = { recordSync, getLastSync };
