// Modularized: All event bindings moved to ui/handlers.js (UIHandlers.bindCore)
// Retain helper for rich text/plain description extraction (used by handlers module)
function getDescriptionContent($editorEl){
  try { if(window.RichTextEditor && typeof window.RichTextEditor.getRichTextContent === 'function'){ return window.RichTextEditor.getRichTextContent($editorEl).trim(); } } catch(e){ console.debug('RichTextEditor get content failed, falling back.', e); }
  if($editorEl.is('textarea')) return ($editorEl.val()||'').trim();
  return ($editorEl.text()||'').trim();
}

// Kick off core bindings
if(window.UIHandlers && typeof window.UIHandlers.bindCore === 'function'){
  window.UIHandlers.bindCore();
} else {
  // Fallback: defer until handlers script loads
  $(document).ready(function(){ if(window.UIHandlers && typeof window.UIHandlers.bindCore==='function'){ window.UIHandlers.bindCore(); } });
}
