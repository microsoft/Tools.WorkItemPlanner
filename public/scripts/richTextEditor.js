/**
 * Rich Text Editor functionality for task and deliverable descriptions
 */

// Feature flag to enable/disable rich text editor
window.ENABLE_RICH_TEXT_EDITOR = false; // Toggle to true to enable rich formatting

$(document).ready(function() {
  if (!window.ENABLE_RICH_TEXT_EDITOR) {
    document.body.classList.add('plain-text-mode');
    convertEditorsToPlainText();
  } else {
    initializeRichTextEditors();
  }
});

// Replace contenteditable divs with textarea elements for reliable Enter/newline handling in plain text mode
function convertEditorsToPlainText() {
  $('.rich-text-editor').each(function() {
    const $div = $(this);
    // Skip if already converted
    if ($div.is('textarea')) return;
    const html = $div.html();
    // Convert <br> and block tags to newlines
    const temp = document.createElement('div');
    temp.innerHTML = html;
    // Replace <br> with \n
    temp.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    // Add line breaks after block elements
    const blockTags = ['P','DIV'];
    temp.childNodes.forEach(node => {
      if (node.nodeType === 1 && blockTags.includes(node.nodeName)) {
        if (!/\n$/.test(node.textContent)) node.textContent += '\n';
      }
    });
    const text = temp.textContent.replace(/\n{2,}/g,'\n').trim();
    const placeholder = $div.data('placeholder') || '';
    const classes = ($div.attr('class')||'')
      .replace('rich-text-editor','')
      .trim();
    const $ta = $('<textarea/>', {
      'class': classes + ' plain-text-auto-resize',
      'placeholder': placeholder,
      'rows': 1,
      'style': 'resize:none; overflow:hidden;'
    }).val(text);
    // Preserve sizing
    const minH = $div.css('min-height');
    const maxH = $div.css('max-height');
    if (minH) $ta.css('min-height', minH);
    if (maxH) $ta.css('max-height', maxH);
    $div.replaceWith($ta);
    autoResizeTextarea($ta[0]);
  });
}

// Auto-resize helper for plain text textareas
function autoResizeTextarea(el) {
  if (!el) return;
  const $el = $(el);
  // Respect max-height if defined
  const maxH = parseInt($el.css('max-height')) || Infinity;
  el.style.height = 'auto';
  let newH = el.scrollHeight;
  if (newH > maxH) {
    newH = maxH;
    el.style.overflowY = 'auto';
  } else {
    el.style.overflowY = 'hidden';
  }
  el.style.height = newH + 'px';
}

// Delegate input handler for dynamically added items
$(document).on('input', 'textarea.plain-text-auto-resize', function() {
  autoResizeTextarea(this);
});

// Also adjust on window resize (font metrics might change)
$(window).on('resize', function() {
  $('textarea.plain-text-auto-resize').each(function(){ autoResizeTextarea(this); });
});

function initializeRichTextEditors() {
  // Skip initialization if rich text editor is disabled
  if (!window.ENABLE_RICH_TEXT_EDITOR) {
    return;
  }
  
  // Handle toolbar button clicks
  $(document).on('click', '.toolbar-btn', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Handle image button separately
    if ($(this).hasClass('image-btn')) {
      const imageInput = $(this).closest('.rich-text-toolbar').find('.image-input');
      imageInput.click();
      return;
    }
    
    // Handle expand button separately
    if ($(this).hasClass('expand-btn')) {
      toggleDescriptionWidth($(this));
      return;
    }
    
    const command = $(this).data('command');
    const editor = $(this).closest('.description-section').find('.rich-text-editor')[0];
    
    if (editor) {
      // Focus the editor first
      editor.focus();
      
      // Execute the command
      document.execCommand(command, false, null);
      
      // Update button states
      updateToolbarButtonStates($(this).closest('.rich-text-toolbar'));
    }
  });

  // Handle image file selection
  $(document).on('change', '.image-input', function(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const editor = $(this).closest('.description-section').find('.rich-text-editor')[0];
      handleImagePaste(file, editor);
    }
    // Reset the input
    $(this).val('');
  });

  // Handle selection change to update button states
  $(document).on('mouseup keyup', '.rich-text-editor', function() {
    const toolbar = $(this).closest('.description-section').find('.rich-text-toolbar');
    updateToolbarButtonStates(toolbar);
  });

  // Handle focus events
  $(document).on('focus', '.rich-text-editor', function() {
    const toolbar = $(this).closest('.description-section').find('.rich-text-toolbar');
    updateToolbarButtonStates(toolbar);
  });

  // Handle paste events to clean up formatting and support images
  $(document).on('paste', '.rich-text-editor', function(e) {
    e.preventDefault();
    
    const clipboardData = e.originalEvent.clipboardData || window.clipboardData;
    
    // Check if there are files (images) in clipboard
    if (clipboardData.files && clipboardData.files.length > 0) {
      Array.from(clipboardData.files).forEach(file => {
        if (file.type.startsWith('image/')) {
          handleImagePaste(file, this);
        }
      });
      return;
    }
    
    // Handle HTML content if available
    const htmlData = clipboardData.getData('text/html');
    if (htmlData && htmlData.trim() !== '') {
      // Clean up the HTML and insert it
      const cleanHtml = cleanPastedHtml(htmlData);
      document.execCommand('insertHTML', false, cleanHtml);
      return;
    }
    
    // Fall back to plain text
    const textData = clipboardData.getData('text/plain');
    if (textData) {
      document.execCommand('insertText', false, textData);
    }
  });

  // Handle drag and drop for images
  $(document).on('dragover', '.rich-text-editor', function(e) {
    e.preventDefault();
    $(this).addClass('drag-over');
  });

  $(document).on('dragleave', '.rich-text-editor', function(e) {
    e.preventDefault();
    $(this).removeClass('drag-over');
  });

  $(document).on('drop', '.rich-text-editor', function(e) {
    e.preventDefault();
    $(this).removeClass('drag-over');
    
    const files = e.originalEvent.dataTransfer.files;
    if (files.length > 0) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          handleImagePaste(file, this);
        }
      });
    }
  });

  // Handle image selection and deletion
  $(document).on('click', '.rich-text-editor img', function(e) {
    e.preventDefault();
    // Clear any existing selections
    window.getSelection().removeAllRanges();
    
    // Add visual feedback for selected image
    $('.rich-text-editor img').removeClass('selected');
    $(this).addClass('selected');
    
    // Store reference to selected image
    $(this).closest('.rich-text-editor').data('selectedImage', this);
  });

  // Handle deletion of selected images
  $(document).on('keydown', '.rich-text-editor', function(e) {
    const selectedImage = $(this).data('selectedImage');
    
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImage) {
      e.preventDefault();
      
      // Remove the selected image and its paragraph wrapper if empty
      const $img = $(selectedImage);
      const $paragraph = $img.closest('p');
      
      if ($paragraph.length && $paragraph.children().length === 1 && $paragraph.children('img').length === 1) {
        // If paragraph only contains the image, remove the whole paragraph
        $paragraph.remove();
      } else {
        // Otherwise just remove the image
        $img.remove();
      }
      
      // Clear the selected image reference
      $(this).removeData('selectedImage');
      $('.rich-text-editor img').removeClass('selected');
      
      return false;
    }
    
    // Handle Enter key to create a single line break (Shift+Enter can act the same)
    if (e.key === 'Enter') {
      // Allow browser default paragraph creation for standard Enter
      if (e.shiftKey) {
        // Shift+Enter -> soft break
        e.preventDefault();
        document.execCommand('insertHTML', false, '<br>');
      }
      return; // Don't block default
    }
  });

  // Clear image selection when clicking elsewhere in editor
  $(document).on('click', '.rich-text-editor', function(e) {
    if (!$(e.target).is('img')) {
      $('.rich-text-editor img').removeClass('selected');
      $(this).removeData('selectedImage');
    }
  });
}

function updateToolbarButtonStates(toolbar) {
  if (!toolbar || toolbar.length === 0) return;
  
  const buttons = toolbar.find('.toolbar-btn');
  
  buttons.each(function() {
    const command = $(this).data('command');
    const isActive = document.queryCommandState(command);
    
    if (isActive) {
      $(this).addClass('active');
    } else {
      $(this).removeClass('active');
    }
  });
}

// Helper functions for getting and setting rich text content
function getRichTextContent(element) {
  if (element && element.length > 0) {
    // Plain text mode or textarea: return value/text consistently
    if (!window.ENABLE_RICH_TEXT_EDITOR) {
      if (element.is('textarea')) {
        return (element.val() || '').trim();
      }
      return element.text().trim();
    }
    
    const content = element.html().trim();
    // Return empty string if only contains placeholder or whitespace
    if (content === '' || content === '<br>' || content === '<div><br></div>') {
      return '';
    }
    return content;
  }
  return '';
}

function setRichTextContent(element, content) {
  if (element && element.length > 0) {
    if (!window.ENABLE_RICH_TEXT_EDITOR) {
      if (element.is('textarea')) {
        element.val(content || '').trigger('input');
      } else {
        element.text(content || '');
      }
      return;
    }
    
    if (content && content.trim() !== '') {
      element.html(content);
    } else {
      element.empty();
    }
  }
}

// Function to get plain text from rich text content
function getRichTextPlainText(element) {
  if (element && element.length > 0) {
    return element.text().trim();
  }
  return '';
}

// Function to convert plain text to simple HTML
function convertPlainTextToHtml(text) {
  if (!text || text.trim() === '') return '';
  
  // Replace line breaks with <br> tags
  return text.replace(/\n/g, '<br>');
}

// Function to handle image paste
function handleImagePaste(file, editor) {
  // Check file size (limit to 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (file.size > maxSize) {
    alert('Image is too large. Please use an image smaller than 5MB.');
    return;
  }

  const reader = new FileReader();
  
  reader.onload = function(e) {
    const imageData = e.target.result;
    
    // If image is large, compress it
    if (file.size > 500 * 1024) { // 500KB
      compressImage(imageData, function(compressedData) {
        insertImageIntoEditor(compressedData, editor);
      });
    } else {
      insertImageIntoEditor(imageData, editor);
    }
  };
  
  reader.readAsDataURL(file);
}

// Function to insert image into editor
function insertImageIntoEditor(imageData, editor) {
  // Wrap image in a paragraph with line breaks for better editing
  const imageHtml = `<p><br></p><p><img src="${imageData}" alt="Pasted image" style="display: inline-block;" /></p><p><br></p>`;
  
  // Focus the editor and insert the image
  editor.focus();
  document.execCommand('insertHTML', false, imageHtml);
  
  // Update toolbar button states after insertion
  const toolbar = $(editor).closest('.description-section').find('.rich-text-toolbar');
  updateToolbarButtonStates(toolbar);
}

// Function to compress image
function compressImage(imageData, callback) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  img.onload = function() {
    // Calculate new dimensions (max 500px width to match CSS)
    const maxWidth = 500;
    const maxHeight = 400;
    let { width, height } = img;
    
    // Calculate scale factor to fit within max dimensions while maintaining aspect ratio
    const scaleX = width > maxWidth ? maxWidth / width : 1;
    const scaleY = height > maxHeight ? maxHeight / height : 1;
    const scale = Math.min(scaleX, scaleY);
    
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    
    canvas.width = width;
    canvas.height = height;
    
    // Draw and compress
    ctx.drawImage(img, 0, 0, width, height);
    const compressedData = canvas.toDataURL('image/jpeg', 0.8);
    callback(compressedData);
  };
  
  img.src = imageData;
}

// Function to clean pasted HTML content
function cleanPastedHtml(html) {
  // Create a temporary div to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Remove script tags and other potentially harmful elements
  const scriptTags = tempDiv.querySelectorAll('script, link, meta, style');
  scriptTags.forEach(tag => tag.remove());
  
  // Clean up attributes - keep only safe ones
  const allElements = tempDiv.querySelectorAll('*');
  allElements.forEach(element => {
    // List of allowed attributes
    const allowedAttributes = ['src', 'alt', 'href', 'title', 'style'];
    const attributes = Array.from(element.attributes);
    
    attributes.forEach(attr => {
      if (!allowedAttributes.includes(attr.name.toLowerCase())) {
        element.removeAttribute(attr.name);
      }
    });
    
    // Sanitize style attribute
    if (element.hasAttribute('style')) {
      const style = element.getAttribute('style');
      // Remove potentially dangerous CSS
      const cleanStyle = style.replace(/javascript:|expression\(|behavior:|binding:/gi, '');
      element.setAttribute('style', cleanStyle);
    }
  });
  
  // Convert some common elements to simpler ones
  const bTags = tempDiv.querySelectorAll('b');
  bTags.forEach(b => {
    const strong = document.createElement('strong');
    strong.innerHTML = b.innerHTML;
    b.parentNode.replaceChild(strong, b);
  });
  
  const iTags = tempDiv.querySelectorAll('i');
  iTags.forEach(i => {
    const em = document.createElement('em');
    em.innerHTML = i.innerHTML;
    i.parentNode.replaceChild(em, i);
  });
  
  return tempDiv.innerHTML;
}

// Function to toggle description width
function toggleDescriptionWidth(button) {
  const descriptionSection = button.closest('.description-section');
  const isExpanded = descriptionSection.hasClass('expanded');
  const icon = button.find('i');
  
  if (isExpanded) {
    // Collapse
    descriptionSection.removeClass('expanded');
    icon.removeClass('fa-compress-arrows-alt').addClass('fa-expand-arrows-alt');
    button.attr('title', 'Expand Width');
  } else {
    // Expand
    descriptionSection.addClass('expanded');
    icon.removeClass('fa-expand-arrows-alt').addClass('fa-compress-arrows-alt');
    button.attr('title', 'Collapse Width');
  }
}

// Export functions for use in other scripts
window.RichTextEditor = {
  getRichTextContent: getRichTextContent,
  setRichTextContent: setRichTextContent,
  getRichTextPlainText: getRichTextPlainText,
  convertPlainTextToHtml: convertPlainTextToHtml,
  updateToolbarButtonStates: updateToolbarButtonStates
};
