document.addEventListener("DOMContentLoaded", function () {

  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("navMenu");
  const navBar = document.querySelector(".navBar");

  if (hamburger && navMenu) {
    const toggleMenu = function () {
      navMenu.classList.toggle("active");
      hamburger.classList.toggle("open");

      const isOpen = navMenu.classList.contains("active");
      hamburger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      hamburger.setAttribute("aria-label", isOpen ? "Cerrar menu" : "Abrir menu");
      document.body.classList.toggle("menu-open", isOpen);
    };

    const closeMenu = function () {
      navMenu.classList.remove("active");
      hamburger.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
      hamburger.setAttribute("aria-label", "Abrir menu");
      document.body.classList.remove("menu-open");
    };

    closeMenu();

    hamburger.addEventListener("click", toggleMenu);

    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", function (event) {
      if (window.innerWidth > 680) {
        return;
      }

      if (!navMenu.classList.contains("active") && !navMenu.contains(event.target) && !hamburger.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 680) {
        closeMenu();
      }
    });
  }

  if (navBar) {
    const onScrollNav = function () {
      navBar.classList.toggle("scrolled", window.scrollY > 16);
    };

    onScrollNav();
    window.addEventListener("scroll", onScrollNav);
  }

});


