export function initHomePage() {
  const chips = document.querySelectorAll('[data-challenge]');
  chips.forEach((item) => {
    item.addEventListener('click', () => {
      const target = item.dataset.challenge;
      const panel = document.querySelector(`#${target}`);
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  const main = document.querySelector('main');
  if (main && !main.querySelector('[data-report-links-section]')) {
    const section = document.createElement('section');
    section.className = 'section';
    section.dataset.reportLinksSection = '';
    section.innerHTML = `
      <div class="container">
        <div class="theme-panel" style="padding: 2.3rem;">
          <span class="badge">External links</span>
          <h2 style="margin-top: 1rem;">Official help and cyber-safety resources</h2>
          <p>Open the external links page for Indian reporting portals and trusted cybersecurity resources, with a short description of each.</p>
          <a class="primary-btn focus-ring" href="pages/external-links.html">Explore external links <span>&rarr;</span></a>
        </div>
      </div>
    `;
    main.append(section);
  }
}
