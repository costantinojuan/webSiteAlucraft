document.addEventListener("DOMContentLoaded", function () {

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

   const form = document.getElementById("contactForm");
   const formStatus = document.getElementById("formStatus");
   const formStart = document.getElementById("form_start");

   if (form && formStart) {
      formStart.value = String(Math.floor(Date.now() / 1000));
   }

   if (form && formStatus) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("status") === "error") {
         formStatus.textContent = "No se pudo enviar el mensaje. Revisá los datos e intentá nuevamente.";
         formStatus.classList.add("error");
      }

      form.addEventListener("submit", function (event) {
         const name = document.getElementById("name");
         const phone = document.getElementById("telefono");
         const email = document.getElementById("email");
         const message = document.getElementById("message");
         const submitButton = form.querySelector("button[type='submit']");

         const fields = [name, phone, email, message];
         const phoneRegex = /^[0-9+()\-\s]{8,20}$/;

         fields.forEach((field) => field.classList.remove("input-error"));
         formStatus.textContent = "";
         formStatus.classList.remove("error", "success");

         if (name.value.trim().length < 2) {
            event.preventDefault();
            name.classList.add("input-error");
            formStatus.textContent = "Ingresá un nombre válido.";
            formStatus.classList.add("error");
            name.focus();
            return;
         }

         if (!phoneRegex.test(phone.value.trim())) {
            event.preventDefault();
            phone.classList.add("input-error");
            formStatus.textContent = "Ingresá un teléfono válido (8 a 20 caracteres).";
            formStatus.classList.add("error");
            phone.focus();
            return;
         }

         if (!email.checkValidity()) {
            event.preventDefault();
            email.classList.add("input-error");
            formStatus.textContent = "Ingresá un email válido.";
            formStatus.classList.add("error");
            email.focus();
            return;
         }

         if (message.value.trim().length < 10) {
            event.preventDefault();
            message.classList.add("input-error");
            formStatus.textContent = "Tu mensaje debe tener al menos 10 caracteres.";
            formStatus.classList.add("error");
            message.focus();
            return;
         }

         if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Enviando...";
         }

         formStatus.textContent = "Estamos enviando tu mensaje.";
         formStatus.classList.add("success");
      });
   }



});


