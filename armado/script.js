// Minimal interactions for armado pages
document.addEventListener('click', function(e){
  // Toggle collapsible steps
  var t = e.target.closest('[data-toggle="collapse"]');
  if(t){
    e.preventDefault();
    var target = document.querySelector(t.getAttribute('data-target'));
    if(!target) return;
    target.hidden = !target.hidden;
    t.setAttribute('aria-expanded', String(!target.hidden));
  }
});

// Open WhatsApp links that use data-wa attribute (if present)
document.addEventListener('click', function(e){
  var btn = e.target.closest('[data-wa]');
  if(!btn) return;
  var phone = btn.getAttribute('data-wa');
  var text = encodeURIComponent(btn.getAttribute('data-text')||'Hola, tengo una consulta sobre el armado');
  var url = 'https://wa.me/' + phone + '?text=' + text;
  window.open(url,'_blank');
});

// Small helper: copy a link to clipboard
function copyToClipboard(text){
  if(!navigator.clipboard) return false;
  navigator.clipboard.writeText(text).catch(()=>{});
}
