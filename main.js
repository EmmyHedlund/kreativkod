// When you add real project photos named bild1.jpg–bild5.jpg to assets/,
// the gallery automatically replaces the five clearly marked empty slots.
document.querySelectorAll('.photo').forEach((figure, i) => {
  const image = new Image();
  image.alt = ['The Forest Fairy Rave installation','The glowing aura around a participant','A visitor interacting through movement','Light and sound during the experience','Forest Fairy Rave at the Algorave'][i];
  image.loading = 'lazy';
  image.onload = () => { const slot = figure.querySelector('.photo-empty'); if (slot) slot.replaceWith(image); image.className = 'gallery-image'; };
  image.src = `assets/bild${i + 1}.jpg`;
});
