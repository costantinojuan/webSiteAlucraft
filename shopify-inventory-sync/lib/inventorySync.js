const { getInventorySyncMode } = require("./config");
const { syncJuegoLivingStock } = require("./syncJuegoStock");
const { syncAllStock } = require("./syncAllStock");

async function runInventorySync() {
  const mode = getInventorySyncMode();
  if (mode === "legacy") {
    const result = await syncJuegoLivingStock();
    return { ...result, mode: "legacy" };
  }
  return syncAllStock();
}

module.exports = { runInventorySync };
