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

    navMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", function (event) {
      if (window.innerWidth > 680) return;
      if (navMenu.classList.contains("active") && !navMenu.contains(event.target) && !hamburger.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 680) closeMenu();
    });
  }

  if (navBar) {
    const onScrollNav = function () {
      navBar.classList.toggle("scrolled", window.scrollY > 16);
    };
    onScrollNav();
    window.addEventListener("scroll", onScrollNav);
  }

  var video = document.getElementById("armadoBandVideo");
  var videoBtn = document.getElementById("armadoBandVideoBtn");
  var videoWrap = video && video.closest(".armadoBandVideo");
  if (video && videoBtn && videoWrap) {
    var started = false;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var setVideoState = function (playing) {
      videoBtn.setAttribute("aria-pressed", playing ? "false" : "true");
      videoBtn.textContent = playing ? "Pausar" : "Reproducir";
      videoBtn.setAttribute("aria-label", playing ? "Pausar video" : "Reproducir video");
    };

    var showFirstFrame = function (done) {
      var revealed = false;
      var reveal = function () {
        if (revealed) return;
        revealed = true;
        videoWrap.classList.add("is-visible");
        if (done) done();
      };
      var seekToStart = function () {
        window.setTimeout(reveal, 450);
        var onSeeked = function () {
          video.removeEventListener("seeked", onSeeked);
          reveal();
        };
        video.addEventListener("seeked", onSeeked);
        try {
          video.currentTime = 0.05;
        } catch (err) {
          reveal();
        }
      };
      if (video.readyState >= 2) {
        seekToStart();
      } else {
        video.addEventListener("loadeddata", seekToStart, { once: true });
        if (typeof video.load === "function") video.load();
      }
    };

    var beginPlayback = function () {
      if (started) return;
      started = true;
      showFirstFrame(function () {
        if (reduced) {
          setVideoState(false);
          return;
        }
        video.play();
        setVideoState(true);
      });
    };

    setVideoState(false);

    if (video.readyState >= 2) {
      video.currentTime = 0.001;
    } else {
      video.addEventListener(
        "loadeddata",
        function () {
          video.currentTime = 0.001;
        },
        { once: true }
      );
    }

    video.addEventListener("ended", function () {
      setVideoState(false);
    });

    videoBtn.addEventListener("click", function () {
      if (video.paused) {
        if (!started) {
          beginPlayback();
          return;
        }
        video.play();
        setVideoState(true);
      } else {
        video.pause();
        setVideoState(false);
      }
    });

    if (reduced) {
      videoWrap.classList.add("is-visible");
    } else if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          if (!entries[0] || !entries[0].isIntersecting) return;
          observer.disconnect();
          beginPlayback();
        },
        { threshold: 0.35 }
      );
      observer.observe(document.querySelector(".armadoBand") || video);
    } else {
      beginPlayback();
    }
  }
});
