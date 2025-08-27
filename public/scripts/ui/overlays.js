// Overlay / modal helpers extracted from main.js (no behavior change)
(function(){
  function showPATPopup(isRetryAttempt){
    if (isRetryAttempt === false){
      $('#pat-popup-invalid-p').hide();
      $('#pat-popup-modal').modal('show');
    } else {
      $('#pat-popup-invalid-p').show();
      $('#pat-popup-modal').modal('show');
    }
  }
  function closePatPopup(){ $('#pat-popup-modal').modal('hide'); }
  window.Overlays = { showPATPopup, closePatPopup };
})();
