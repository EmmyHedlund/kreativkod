// Alt-texter för de fem galleribilderna (i samma ordning som bild1–bild5)
const altTexts = [
  'The Forest Fairy Rave installation',
  'The glowing aura around a participant',
  'A visitor interacting through movement',
  'Light and sound during the experience',
  'Forest Fairy Rave at the Algorave'
];

// Gå igenom varje .photo-element i galleriet
document.querySelectorAll('.photo').forEach((figure, i) => {

  // Skapa en ny bild med alt-text och lazy loading
  const image = new Image();
  image.alt = altTexts[i];
  image.loading = 'lazy';
  image.className = 'gallery-image';

  // När bilden har laddats: byt ut den tomma platshållaren mot bilden
  image.onload = () => {
    const slot = figure.querySelector('.photo-empty');
    if (slot) slot.replaceWith(image);
  };

  // Starta laddningen (bild1.jpg, bild2.jpg, ...)
  // Om filen saknas körs onload aldrig och platshållaren ligger kvar
  image.src = `assets/bild${i + 1}.jpg`;
});