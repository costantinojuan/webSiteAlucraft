document.addEventListener("DOMContentLoaded", function () {


const images = [
  {
    src: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1400",
    caption: "Elegant bedroom interior"
  },
  {
    src: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1400",
    caption: "The lounge area"
  },
  {
    src: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=1400",
    caption: "Explore the twisting and charming streets"
  },
  {
    src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1400",
    caption: "The outer terrace view"
  }
];

let currentIndex = 0;

const mainImage = document.getElementById("mainImage");
const caption = document.getElementById("caption");
const nextBtn = document.querySelector(".next");
const prevBtn = document.querySelector(".prev");
const thumbs = document.querySelectorAll(".interiorThumbs img");

function updateSlider(index) {
  mainImage.style.opacity = 0;

  setTimeout(() => {
    mainImage.src = images[index].src;
    caption.textContent = images[index].caption;
    mainImage.style.opacity = 1;
  }, 200);

  currentIndex = index;
}

nextBtn.addEventListener("click", () => {
  let newIndex = (currentIndex + 1) % images.length;
  updateSlider(newIndex);
});

prevBtn.addEventListener("click", () => {
  let newIndex = (currentIndex - 1 + images.length) % images.length;
  updateSlider(newIndex);
});

thumbs.forEach((thumb, index) => {
  thumb.addEventListener("click", () => {
    updateSlider(index);
  });
});

/* Carousel */

const carousel = document.querySelector(".carouselTrack");

let isPaused = false;

carousel.addEventListener("click", () => {
  if (isPaused) {
    carousel.style.animationPlayState = "running";
    isPaused = false;
  } else {
    carousel.style.animationPlayState = "paused";
    isPaused = true;
  }
});

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

});