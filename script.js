document.addEventListener("DOMContentLoaded", function () {

  /* =========================
     CAROUSEL
  ========================= */

  const track = document.getElementById("track");

  if (track) {

    track.innerHTML += track.innerHTML;

    let position = 0;
    let speed = 0.5;
    let isPaused = false;

    const originalWidth = track.scrollWidth / 2;

    function animate() {
      if (!isPaused) {
        position -= speed;

        if (Math.abs(position) >= originalWidth) {
          position = 0;
        }

        track.style.transform = `translateX(${position}px)`;
      }

      requestAnimationFrame(animate);
    }

    animate();

    track.addEventListener("click", () => {
      isPaused = !isPaused;
    });
  }

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


const cards = document.querySelectorAll(".card");

const observer2 = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add("show");
    }
  });
});

cards.forEach(card=>{
  observer2.observe(card);
});
  

});


