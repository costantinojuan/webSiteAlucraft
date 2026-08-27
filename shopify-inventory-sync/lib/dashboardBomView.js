const { getSyncConfig, getInventorySyncMode } = require("./config");
const { getProductWithVariants } = require("./shopifyAdmin");
const { loadComponentStock } = require("./bom/loadComponentStock");
const { getRecipe } = require("./bom/recipes");
const { calculateFabricable } = require("./bom/calculate");
const { calculateWithSharedStructure } = require("./bom/sharedStructureAllocation");
const { calculateJuegoFabricableFromComponents } = require("./syncJuegoStock");
const {
  parseVariantTitle,
  parseMesaVariantTitle,
  mesaColorFromJuegoTitle,
} = require("./bom/parseVariant");
const { PRODUCT_LABELS } = require("./dashboardData");

const COMPONENT_GROUPS = [
  {
    id: "pieces_mesa",
    title: "Piezas — Mesa",
    hint: "2 laterales + 1 tabla por mesa. Solo las pintadas entran en lo vendible.",
    keys: ["lat_mes", "tab_mes"],
  },
  {
    id: "pieces_sillon",
    title: "Piezas — Sillones",
    hint: "Laterales rectos e inclinados: la misma pieza para 1 y 3 cuerpos (2 por sillón). El respaldo de estructura es uno solo.",
    keys: ["lat_sil_rec", "lat_sil_inc", "bas_s1", "res_s1", "bas_s3", "res_s3"],
  },
  {
    id: "pieces_rep",
    title: "Piezas — Reposera",
    hint: "1 base + 2 laterales + 1 accesorio por reposera.",
    keys: ["bas_rep", "lat_rep", "acc_rep"],
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
  {
    id: "packaging_boxes",
    title: "Cajas",
    hint: "Una caja por unidad vendida. El juego usa 2× caja S1 + 1× S3 + 1× mesa (sin caja propia).",
    keys: ["caja_s1", "caja_s3", "caja_mes", "caja_rep"],
  },
  {
    id: "packaging_allen",
    title: "Llaves Allen",
    hint: "Una llave por unidad vendida. El juego consume 4 (una por pieza). SKU único compartido.",
    keys: ["llave_allen"],
  },
];

const FINISHED_META = {
  sillon1: {
    title: PRODUCT_LABELS.sillon1,
    hint: "1 sillón = base + respaldo + 2 laterales rectos o inclinados (compartidos con S3) + almohadones + caja.",
    sharedStructure: true,
  },
  sillon3: {
    title: PRODUCT_LABELS.sillon3,
    hint: "1 sillón = base + 2 respaldos + 2 laterales rectos o inclinados (compartidos con S1) + caja.",
    sharedStructure: true,
  },
  mesa: {
    title: PRODUCT_LABELS.mesa,
    hint: "1 mesa = 2 laterales + 1 tabla pintados + 1 caja.",
    sharedStructure: false,
  },
  reposera: {
    title: PRODUCT_LABELS.reposera,
    hint: "1 reposera = base + 2 laterales + accesorio pintados + almohadón + caja.",
    sharedStructure: true,
  },
  juego: {
    title: PRODUCT_LABELS.juego,
    hint: "1 juego = BOM completo (2× S1 + 1× S3 + 1× mesa). Se calcula directo desde componentes del depósito.",
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

    const variants = juegoProduct.variants.map((v) => {
      const mesaColor = mesaColorFromJuegoTitle(v.title);
      const { fabricable, bottleneck } = calculateJuegoFabricableFromComponents(stockBySku, v.title);
      const s1 = sillon1.variants.find((x) => x.title === v.title)?.fabricable ?? 0;
      const s3 = sillon3.variants.find((x) => x.title === v.title)?.fabricable ?? 0;
      const mesaStock = mesa.variants.find((x) => x.title === mesaColor)?.fabricable ?? 0;

      return {
        title: v.title,
        fabricable,
        breakdown: { sillon1: s1, sillon3: s3, mesa: mesaStock, mesaColor },
        bottleneck,
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
