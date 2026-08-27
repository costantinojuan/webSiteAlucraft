const { normalizeColor } = require("./colors");

function parseSofaStyle(label) {
  const title = normalizeColor(label);
  if (title.includes("inclin")) {
    return "inclinado";
  }
  if (title.includes("recto") || title.includes("recta")) {
    return "recto";
  }
  throw new Error(`Estilo de sillón desconocido: "${label}" (esperado Recto o Inclinado)`);
}

/**
 * Variante terminada:
 * - "Arena / Beige" → reposera (sin estilo de patas)
 * - "Arena / Beige / Recto" → sillón o juego
 */
function parseVariantTitle(title) {
  const raw = String(title || "").trim();
  const parts = raw.split(" / ").map((part) => part.trim()).filter(Boolean);

  if (parts.length === 2) {
    const [structureColor, fabricColor] = parts;
    return { structureColor, fabricColor, sofaStyle: null, title: raw };
  }

  if (parts.length === 3) {
    const [structureColor, fabricColor, styleLabel] = parts;
    return {
      structureColor,
      fabricColor,
      sofaStyle: parseSofaStyle(styleLabel),
      title: raw,
    };
  }

  throw new Error(
    `Formato de variante inválido (esperado "Estructura / Tela" o "Estructura / Tela / Recto|Inclinado"): "${raw}"`
  );
}

function requireSofaStyle(parsed, productLabel) {
  if (parsed.sofaStyle === "recto" || parsed.sofaStyle === "inclinado") {
    return parsed.sofaStyle;
  }
  throw new Error(
    `${productLabel} necesita la opción Recto/Inclinado en la variante "${parsed.title}"`
  );
}

/** "Arena / Gris oscuro" o "Arena / Beige / Recto" → "Arena" */
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
  parseSofaStyle,
  requireSofaStyle,
  mesaColorFromJuegoTitle,
  parseMesaVariantTitle,
  colorsMatch,
};
