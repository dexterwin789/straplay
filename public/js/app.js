// Home page — particles + extras toggle
(function () {
  if (window.particlesJS) {
    particlesJS('particles-js', {
      particles: {
        number: { value: 80, density: { enable: true, value_area: 800 } },
        color: { value: '#ffffff' },
        shape: { type: 'circle' },
        opacity: { value: 0.4, random: true },
        size: { value: 3, random: true },
        line_linked: { enable: true, distance: 150, color: '#ffffff', opacity: 0.25, width: 1 },
        move: { enable: true, speed: 1.5, direction: 'none', random: false, straight: false, out_mode: 'out' }
      },
      interactivity: {
        detect_on: 'canvas',
        events: { onhover: { enable: true, mode: 'grab' }, onclick: { enable: true, mode: 'push' }, resize: true },
        modes: { grab: { distance: 140, line_linked: { opacity: 0.5 } }, push: { particles_nb: 4 } }
      },
      retina_detect: true
    });
  }

  var btn = document.getElementById('btnMaisJogos');
  var extras = document.getElementById('extraGames');
  if (btn && extras) {
    btn.addEventListener('click', function () {
      var open = extras.style.display !== 'none';
      extras.style.display = open ? 'none' : 'flex';
      btn.textContent = open ? 'MAIS JOGOS' : 'MOSTRAR MENOS';
    });
  }
})();
