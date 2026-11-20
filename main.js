
document.addEventListener("DOMContentLoaded", () => {

  // Bilderna i Forest Fairy Rave-galleriet
  const images = [
    {
      src: "assets/Bild1.jpg",
      alt: "The Forest Fairy Rave installation"
    },
    {
      src: "assets/Bild2.jpg",
      alt: "The glowing aura around a participant"
    },
    {
      src: "assets/Bild3.jpg",
      alt: "A visitor interacting through movement"
    },
    {
      src: "assets/Bild4.jpg",
      alt: "Light and sound during the experience"
    },
    {
      src: "assets/Bild5.jpg",
      alt: "Forest Fairy Rave at the Algorave"
    }
  ];

  // Hitta alla bildplatser i galleriet
  const photoFigures = document.querySelectorAll(
    ".photo-grid .photo"
  );

  photoFigures.forEach((figure, index) => {
    const imageData = images[index];

    if (!imageData) return;

    // Använd befintlig bild eller skapa en ny
    let img = figure.querySelector("img");

    if (!img) {
      img = document.createElement("img");

      // Ta bort eventuell gammal platshållare
      const placeholder = figure.querySelector(".photo-empty");

      if (placeholder) {
        placeholder.replaceWith(img);
      } else {
        figure.prepend(img);
      }
    }

    // Koppla rätt bildfil
    img.src = imageData.src;
    img.alt = imageData.alt;
    img.classList.add("gallery-image");
    img.loading = "lazy";

    // Visa ett fel i konsolen om bilden inte hittas
    img.addEventListener("error", () => {
      console.error(
        "Kunde inte ladda bilden:",
        imageData.src
      );
    });
  });

});
