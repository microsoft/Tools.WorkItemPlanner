// Centralized popup utilities extracted from main.js (unchanged behavior)
window.Popups = (function(){
  function appendAndShow(html, modalId){
    $('body').append(html);
    const $m = $('#' + modalId);
    $m.modal('show');
    $m.on('hidden.bs.modal', function(){ $(this).remove(); });
  }
  function showErrorPopup(message){
    const modalId = `errorModal-${Date.now()}`;
    appendAndShow(`\n      <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">\n        <div class="modal-dialog modal-dialog-centered">\n          <div class="modal-content">\n            <div class="modal-header">\n              <h5 class="modal-title" id="${modalId}Label"><i class="fas fa-exclamation-circle"></i> Error</h5>\n              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>\n            </div>\n            <div class="modal-body">${message}</div>\n          </div>\n        </div>\n      </div>\n    `, modalId);
  }
  function showSuccessPopup(message){
    const modalId = `successModal-${Date.now()}`;
    appendAndShow(`\n      <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">\n        <div class="modal-dialog modal-dialog-centered">\n          <div class="modal-content">\n            <div class="modal-header">\n              <h5 class="modal-title" id="${modalId}Label"><i class="fas fa-check-circle"></i> Success</h5>\n              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>\n            </div>\n            <div class="modal-body">${message}</div>\n          </div>\n        </div>\n      </div>\n    `, modalId);
  }
  function showInfoPopup(message){
    const modalId = `infoModal-${Date.now()}`;
    appendAndShow(`\n      <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">\n        <div class="modal-dialog modal-dialog-centered">\n          <div class="modal-content">\n            <div class="modal-header">\n              <h5 class="modal-title" id="${modalId}Label"><i class="fas fa-info-circle"></i> Information</h5>\n              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>\n            </div>\n            <div class="modal-body">${message}</div>\n          </div>\n        </div>\n      </div>\n    `, modalId);
  }
  function showNonDismissibleErrorPopup(message){
    const modalId = `nonDismissibleModal-${Date.now()}`;
    $('body').append(`\n      <div class="modal fade non-dismissible" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true" data-bs-backdrop="static">\n          <div class="modal-dialog modal-dialog-centered">\n              <div class="modal-content">\n                  <div class="modal-header">\n                      <h5 class="modal-title" id="${modalId}Label"><i class="fas fa-exclamation-circle"></i> Error</h5>\n                  </div>\n                  <div class="modal-body">${message}</div>\n              </div>\n          </div>\n      </div>`);
    const $m = $('#' + modalId); $m.modal('show'); $m.on('hidden.bs.modal', function(){ $(this).remove(); });
  }
  return { showErrorPopup, showSuccessPopup, showInfoPopup, showNonDismissibleErrorPopup };
})();
