const { getSyncConfig, getInventorySyncMode } = require("./config");
const { getProductWithVariants } = require("./shopifyAdmin");
const { loadComponentStock } = require("./bom/loadComponentStock");
const { getRecipe } = require("./bom/recipes");
const { calculateFabricable } = require("./bom/calculate");
const { calculateWithSharedStructure } = require("./bom/sharedStructureAllocation");
const { calculateJuegoStock } = require("./syncJuegoStock");
const {
  parseVariantTitle,
  parseMesaVariantTitle,
  mesaColorFromJuegoTitle,
} = require("./bom/parseVariant");
const { PRODUCT_LABELS } = require("./dashboardData");

const COMPONENT_GROUPS = [
  {
    id: "structures",
    title: "Estructuras metálicas",
    hint: "Stock real en depósito. Limita cuántos muebles podés armar por color.",
    keys: ["est_s1", "est_s3", "est_rep", "mesa_comp"],
  },
  {
    id: "cushions_s1",
    title: "Almohadones — Sillón 1",
    hint: "Base + respaldo por color de tela.",
    keys: ["alm_b1", "alm_r1"],
  },
  {
    id: "cushions_s3",
    title: "Almohadones — Sillón 3",
    hint: "Base + 2 respaldos por unidad.",
    keys: ["alm_b3", "alm_r3"],
  },
  {
    id: "cushions_rep",
    title: "Almohadones — Reposera",
    hint: "Almohadón único por color de tela.",
    keys: ["alm_rep"],
  },
];

const FINISHED_META = {
  sillon1: {
    title: PRODUCT_LABELS.sillon1,
    hint: "1 sillón = 1 estructura + 1 base + 1 respaldo. La estructura se reparte entre telas del mismo color.",
    sharedStructure: true,
  },
  sillon3: {
    title: PRODUCT_LABELS.sillon3,
    hint: "1 sillón = 1 estructura + 1 base + 2 respaldos. La estructura se reparte entre telas del mismo color.",
    sharedStructure: true,
  },
  mesa: {
    title: PRODUCT_LABELS.mesa,
    hint: "1 mesa = 1 componente mesa del mismo color de estructura.",
    sharedStructure: false,
  },
  reposera: {
    title: PRODUCT_LABELS.reposera,
    hint: "1 reposera = 1 estructura + 1 almohadón. Estructura compartida entre telas.",
    sharedStructure: true,
  },
  juego: {
    title: PRODUCT_LABELS.juego,
    hint: "1 juego = 2 sillones 1 + 1 sillón 3 + 1 mesa (misma combinación estructura / tela).",
    sharedStructure: false,
  },
};

function buildComponentGroups(resolvedProducts, stockBySku) {
  const byKey = new Map(resolvedProducts.map((p) => [p.key, p]));

  return COMPONENT_GROUPS.map((group) => ({
    ...group,
    products: group.keys
      .map((key) => byKey.get(key))
      .filter(Boolean)
      .map((product) => ({
        label: product.label,
        title: product.title,
        variants: product.variants.map((v) => ({
          title: v.title,
          sku: v.sku,
          stock: stockBySku.get(v.sku) ?? 0,
        })),
        totalStock: product.variants.reduce(
          (sum, v) => sum + (stockBySku.get(v.sku) ?? 0),
          0
        ),
      })),
  }));
}

function summarizeStructurePools(finishedVariants) {
  const pools = new Map();

  for (const variant of finishedVariants) {
    if (!variant.structureColor || variant.structureStock == null) {
      continue;
    }

    const key = `${variant.productKey}:${variant.structureColor}`;
    if (!pools.has(key)) {
      pools.set(key, {
        productKey: variant.productKey,
        structureColor: variant.structureColor,
        structureStock: variant.structureStock,
        allocated: 0,
        variants: [],
      });
    }

    const pool = pools.get(key);
    pool.allocated += variant.fabricable;
    if (variant.fabricable > 0 || variant.cushionCap > 0) {
      pool.variants.push({
        title: variant.title,
        fabricable: variant.fabricable,
        cushionCap: variant.cushionCap,
      });
    }
  }

  return [...pools.values()];
}

function buildFinishedPreview(config, stockBySku) {
  const { productIds } = config;
  const finished = [];

  async function previewProduct(productKey, parseTitle, sharedStructure) {
    const meta = FINISHED_META[productKey];
    const productId = productIds[productKey];
    if (!productId) {
      return null;
    }

    const product = await getProductWithVariants(productId);
    const parsedVariants = product.variants.map((v) => ({
      title: v.title,
      parsed: parseTitle(v.title),
    }));

    let fabricableByTitle;
    let metaByTitle = new Map();

    if (sharedStructure) {
      const result = calculateWithSharedStructure(
        parsedVariants,
        stockBySku,
        (parsed) => getRecipe(productKey, parsed)
      );
      fabricableByTitle = result.fabricableByTitle;
      metaByTitle = result.metaByTitle;
    } else {
      fabricableByTitle = new Map();
      for (const { title, parsed } of parsedVariants) {
        const recipe = getRecipe(productKey, parsed);
        const { fabricable, bottleneck } = calculateFabricable(stockBySku, recipe);
        fabricableByTitle.set(title, fabricable);
        metaByTitle.set(title, { bottleneck, cushionCap: fabricable });
      }
    }

    const variants = parsedVariants.map(({ title, parsed }) => {
      const fabricable = fabricableByTitle.get(title) ?? 0;
      const detail = metaByTitle.get(title) || {};
      return {
        title,
        fabricable,
        cushionCap: detail.cushionCap,
        structureColor: parsed.structureColor,
        structureStock: detail.structureStock,
        bottleneck: detail.bottleneck,
        productKey,
      };
    });

    return {
      key: productKey,
      title: meta.title,
      hint: meta.hint,
      sharedStructure,
      totalFabricable: variants.reduce((sum, v) => sum + v.fabricable, 0),
      variants,
      structurePools: sharedStructure ? summarizeStructurePools(variants) : [],
    };
  }

  return { previewProduct };
}

async function getDashboardBomView() {
  const config = getSyncConfig();
  const mode = getInventorySyncMode();

  if (mode !== "components") {
    return { mode, components: null, finished: null };
  }

  const { stockBySku, resolvedProducts } = await loadComponentStock(config);
  const { previewProduct } = buildFinishedPreview(config, stockBySku);

  const sillon1 = await previewProduct("sillon1", parseVariantTitle, true);
  const sillon3 = await previewProduct("sillon3", parseVariantTitle, true);
  const mesa = await previewProduct("mesa", parseMesaVariantTitle, false);
  const reposera = await previewProduct("reposera", parseVariantTitle, true);

  let juego = null;
  if (config.productIds.juego) {
    const juegoProduct = await getProductWithVariants(config.productIds.juego);
    const s1Map = new Map(sillon1.variants.map((v) => [v.title, v.fabricable]));
    const s3Map = new Map(sillon3.variants.map((v) => [v.title, v.fabricable]));
    const mesaMap = new Map(mesa.variants.map((v) => [v.title, v.fabricable]));

    const variants = juegoProduct.variants.map((v) => {
      const mesaColor = mesaColorFromJuegoTitle(v.title);
      const s1 = s1Map.get(v.title) ?? 0;
      const s3 = s3Map.get(v.title) ?? 0;
      const mesaStock = mesaMap.get(mesaColor) ?? 0;
      const fabricable = calculateJuegoStock(s1, s3, mesaStock);

      const limits = [
        { label: `Sillón 1 (${s1} → usa ${Math.floor(s1 / 2)} juegos)`, value: Math.floor(s1 / 2) },
        { label: `Sillón 3 (${s3})`, value: s3 },
        { label: `Mesa ${mesaColor} (${mesaStock})`, value: mesaStock },
      ];
      const minLimit = Math.min(...limits.map((l) => l.value));
      const bottleneck = limits.find((l) => l.value === minLimit && fabricable === minLimit);

      return {
        title: v.title,
        fabricable,
        breakdown: { sillon1: s1, sillon3: s3, mesa: mesaStock, mesaColor },
        bottleneck: bottleneck
          ? { label: bottleneck.label, available: bottleneck.value, qtyPerUnit: 1 }
          : null,
      };
    });

    juego = {
      key: "juego",
      title: FINISHED_META.juego.title,
      hint: FINISHED_META.juego.hint,
      sharedStructure: false,
      totalFabricable: variants.reduce((sum, v) => sum + v.fabricable, 0),
      variants,
      structurePools: [],
    };
  }

  return {
    mode,
    components: {
      groups: buildComponentGroups(resolvedProducts, stockBySku),
      totalPhysicalUnits: [...stockBySku.values()].reduce((sum, n) => sum + n, 0),
    },
    finished: [juego, sillon1, sillon3, mesa, reposera].filter(Boolean),
  };
}

module.exports = { getDashboardBomView, COMPONENT_GROUPS, FINISHED_META };
