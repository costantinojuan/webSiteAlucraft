(function () {
  var MONEY_FORMAT = "%24%7B%7Bamount_with_comma_separator%7D%7D";

  var PRODUCTS = [
    { id: "7840729497678", nodeId: "product-component-1772634623360", layout: "card" },
    { id: "7842184069198", nodeId: "product-component-1772634660161", layout: "card" },
    { id: "7842184888398", nodeId: "product-component-1772634578714", layout: "card" },
    { id: "7842184167502", nodeId: "product-component-1772634425523", layout: "card" }
  ];

  function copyButtonStyles() {
    return {
      "font-family": "Roboto, sans-serif",
      "font-size": "18px",
      "padding-top": "17px",
      "padding-bottom": "17px",
      ":hover": { "background-color": "#424242" },
      "background-color": "#272727",
      ":focus": { "background-color": "#424242" },
      "border-radius": "10px",
      "padding-left": "46px",
      "padding-right": "46px"
    };
  }

  function productOptions(layout) {
    var isFull = layout === "full";
    var product = {
      styles: {
        product: isFull
          ? {
              "@media (min-width: 601px)": {
                "max-width": "100%",
                "margin-left": "0",
                "margin-bottom": "50px"
              },
              "text-align": "left"
            }
          : {
              "@media (min-width: 601px)": {
                "max-width": "100%",
                "margin-left": "0",
                "margin-bottom": "0"
              }
            },
        title: {
          "font-family": "Roboto, sans-serif",
          "font-weight": "normal",
          "font-size": isFull ? "26px" : "20px",
          color: "#000000"
        },
          button: copyButtonStyles(),
          quantityInput: {
            "font-size": "18px",
            "padding-top": "17px",
            "padding-bottom": "17px"
          },
          price: {
            "font-family": "Roboto, sans-serif",
            "font-size": isFull ? "20px" : "19px"
        },
        compareAt: {
          "font-family": "Roboto, sans-serif",
          "font-size": isFull ? "17px" : "16.15px"
        },
        unitPrice: {
          "font-family": "Roboto, sans-serif",
          "font-size": isFull ? "17px" : "16.15px"
        },
        description: {
          "font-family": "Roboto, sans-serif",
          "font-size": "17px"
        }
      },
      contents: isFull
        ? { img: true, imgWithCarousel: false, description: true }
        : { options: false },
      width: "100%",
      text: { button: isFull ? "Agregar al carrito" : "Ver Producto" },
      googleFonts: ["Roboto"]
    };

    if (isFull) {
      product.layout = "horizontal";
    } else {
      product.buttonDestination = "modal";
    }

    return {
      product: product,
      productSet: {
        styles: {
          products: {
            "@media (min-width: 601px)": { "margin-left": "-20px" }
          }
        }
      },
      modalProduct: {
        contents: isFull
          ? { img: false, imgWithCarousel: true, button: false, buttonWithQuantity: true }
          : { img: true, imgWithCarousel: false, button: false, buttonWithQuantity: true },
        styles: {
          product: {
            "@media (min-width: 601px)": {
              "max-width": "100%",
              "margin-left": "0px",
              "margin-bottom": "0px"
            }
          },
          button: copyButtonStyles(),
          quantityInput: {
            "font-size": "18px",
            "padding-top": "17px",
            "padding-bottom": "17px"
          },
          title: {
            "font-family": "Roboto, sans-serif",
            "font-weight": "normal",
            "font-size": "26px",
            color: "#4c4c4c"
          },
          price: {
            "font-family": "Roboto, sans-serif",
            "font-weight": "normal",
            "font-size": "18px",
            color: "#4c4c4c"
          },
          compareAt: {
            "font-family": "Roboto, sans-serif",
            "font-weight": "normal",
            "font-size": "15.299999999999999px",
            color: "#4c4c4c"
          },
          unitPrice: {
            "font-family": "Roboto, sans-serif",
            "font-weight": "normal",
            "font-size": "15.299999999999999px",
            color: "#4c4c4c"
          },
          description: {
            "font-family": "Roboto, sans-serif",
            "font-weight": "normal",
            "font-size": "14px",
            color: "#4c4c4c"
          }
        },
        googleFonts: ["Roboto"],
        text: { button: "Agregar al carrito" }
      },
      option: {
        styles: {
          label: isFull
            ? { "font-family": "Roboto, sans-serif", "font-size": "17px" }
            : { "font-family": "Roboto, sans-serif" },
          select: { "font-family": "Roboto, sans-serif" }
        },
        googleFonts: ["Roboto"]
      }
    };
  }

  function mountProducts(ui) {
    if (!ui) return;
    var nodes = PRODUCTS.filter(function (product) {
      return document.getElementById(product.nodeId);
    });
    if (!nodes.length) return;

    nodes.forEach(function (product) {
      try {
        ui.createComponent("product", {
          id: product.id,
          node: document.getElementById(product.nodeId),
          moneyFormat: MONEY_FORMAT,
          options: productOptions(product.layout)
        });
      } catch (err) {
        if (typeof console !== "undefined" && console.error) {
          console.error("Alucraft Shopify product mount failed", product.nodeId, err);
        }
      }
    });
  }

  var started = false;
  function onShopifyReady() {
    if (started || !window.AlucraftShopifyUI) return;
    started = true;
    document.removeEventListener("alucraft:shopify-ready", onShopifyReady);
    mountProducts(window.AlucraftShopifyUI);
  }

  document.addEventListener("alucraft:shopify-ready", onShopifyReady);
  onShopifyReady();
})();

