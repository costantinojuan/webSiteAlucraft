document.addEventListener("DOMContentLoaded", function () {


/* =========================
     MENU HAMBURGUESA
  ========================= */

  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("navMenu");

  if (hamburger && navMenu) {
    hamburger.addEventListener("click", function () {
      navMenu.classList.toggle("active");
    });
  }

  /* =========================
     ANIMACION
  ========================= */


const reveals = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver((entries) => {
   entries.forEach(entry => {
      if(entry.isIntersecting){
         entry.target.classList.add("active");
      }
   });
},{
   threshold:0.2
});

reveals.forEach(el => observer.observe(el));

  /* =========================
     PORTFOLIO
  ========================= */


  const portfolioAlbums = [
    {
      title: "F1",
      images: [
        "../multimedia-portadas/1.webp",
        "../multimedia-portadas/2.webp"
      ]
    },
    {
      title: "F2",
      images: [
        "../multimedia-portadas/3.webp",
        "../multimedia-portadas/4.webp"
      ]
    },
    {
      title: "F3",
      images: [
        "../multimedia-portadas/5.webp",
        "../multimedia-portadas/6.webp"
      ]
    },
    {
      title: "F4",
      images: [
        "../multimedia-portadas/7.webp",
        "../multimedia-portadas/8.webp"
      ]
    },
    {
      title: "M1",
      images: [
        "../multimedia-portadas/2.webp",
        "../multimedia-portadas/1.webp"
      ]
    },
    {
      title: "M2",
      images: [
        "../multimedia-portadas/4.webp",
        "../multimedia-portadas/3.webp"
      ]
    },
    {
      title: "M3",
      images: [
        "../multimedia-portadas/6.webp",
        "../multimedia-portadas/5.webp"
      ]
    },
    {
      title: "M4",
      images: [
        "../multimedia-portadas/8.webp",
        "../multimedia-portadas/7.webp"
      ]
    }
  ];

  let portfolioAlbumIndex = 0;
  let portfolioImageIndex = 0;

  const modal = document.getElementById("portfolioModal");
  const gallery = document.getElementById("portfolioGallery");
  const title = document.getElementById("portfolioModalTitle");
  const counter = document.getElementById("portfolioModalCounter");

  function showPortfolioImage() {
    if (!modal || !gallery || !title || !counter) return;

    const album = portfolioAlbums[portfolioAlbumIndex];
    if (!album) return;

    const images = album.images || [];
    if (!images.length) return;

    if (portfolioImageIndex < 0) portfolioImageIndex = images.length - 1;
    if (portfolioImageIndex >= images.length) portfolioImageIndex = 0;

    title.textContent = album.title || "";
    counter.textContent = `${portfolioImageIndex + 1} / ${images.length}`;
    gallery.innerHTML = "";

    const img = document.createElement("img");
    img.src = images[portfolioImageIndex];
    img.alt = album.title || "";
    gallery.appendChild(img);
  }

  window.openPortfolioModal = (albumIndex) => {
    portfolioAlbumIndex = albumIndex;
    portfolioImageIndex = 0;
    showPortfolioImage();
    if (!modal) return;
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
  };

  window.closePortfolioModal = () => {
    if (!modal) return;
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  };

  window.prevPortfolioImage = () => {
    portfolioImageIndex -= 1;
    showPortfolioImage();
  };

  window.nextPortfolioImage = () => {
    portfolioImageIndex += 1;
    showPortfolioImage();
  };

  window.addEventListener("keydown", (event) => {
    const isOpen = modal && modal.style.display === "flex";
    if (!isOpen) return;

    if (event.key === "Escape") {
      closePortfolioModal();
      return;
    }

    if (event.key === "ArrowRight") {
      nextPortfolioImage();
      return;
    }

    if (event.key === "ArrowLeft") {
      prevPortfolioImage();
    }
  });

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closePortfolioModal();
      }
    });
  }


});