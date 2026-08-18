const { normalizeColor } = require("./colors");

/**
 * Variante terminada: "Arena / Beige" → { structureColor, fabricColor, title }
 */
function parseVariantTitle(title) {
  const raw = String(title || "").trim();
  if (!raw.includes(" / ")) {
    throw new Error(`Formato de variante inválido (esperado "Estructura / Tela"): "${raw}"`);
  }

  const [structureColor, fabricColor] = raw.split(" / ").map((part) => part.trim());
  if (!structureColor || !fabricColor) {
    throw new Error(`Formato de variante inválido: "${raw}"`);
  }

  return { structureColor, fabricColor, title: raw };
}

/** "Arena / Gris oscuro" → "Arena" (para matchear mesa ratona terminada) */
function mesaColorFromJuegoTitle(juegoVariantTitle) {
  const title = String(juegoVariantTitle || "").trim();
  if (title.includes(" / ")) {
    return title.split(" / ")[0].trim();
  }
  return title;
}

/** Color de estructura en variante de mesa terminada (solo un color). */
function parseMesaVariantTitle(title) {
  const structureColor = String(title || "").trim();
  if (!structureColor) {
    throw new Error("Variante de mesa sin color");
  }
  return { structureColor, title: structureColor };
}

function colorsMatch(a, b) {
  return normalizeColor(a) === normalizeColor(b);
}

module.exports = {
  parseVariantTitle,
  mesaColorFromJuegoTitle,
  parseMesaVariantTitle,
  colorsMatch,
};
