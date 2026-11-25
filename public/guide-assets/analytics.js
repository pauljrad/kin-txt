// Use the same GA4 property as the KiN-TXT website.
const measurementId = 'G-3QT73NTM4S';
window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', measurementId);
const tag = document.createElement('script');
tag.async = true;
tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
document.head.appendChild(tag);
document.addEventListener('click', event => {
  const link = event.target instanceof Element && event.target.closest('a[data-event]');
  if (link) gtag('event', link.dataset.event, {
    placement: 'guide', guide_slug: location.pathname.split('/').filter(Boolean).pop(), reader_mode: link.dataset.mode
  });
});
