/**
 * UNICEFINDER - Register New Found Item Logic
 */

let selectedPhotoFile = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;
  setupBottomNav();

  initDateTimeDefault();
  initPhotoUploader();

  const form = document.getElementById('newItemForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
});

/**
 * Sets current local date and time in the datetime-local input
 */
function initDateTimeDefault() {
  const foundAtInput = document.getElementById('found_at');
  if (!foundAtInput) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  foundAtInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Setup photo uploader drag & drop and preview
 */
function initPhotoUploader() {
  const dropArea = document.getElementById('photoDropArea');
  const fileInput = document.getElementById('photoInput');
  const previewWrap = document.getElementById('photoPreviewWrap');
  const previewImg = document.getElementById('photoPreviewImg');
  const removeBtn = document.getElementById('photoRemoveBtn');

  if (!dropArea || !fileInput) return;

  // Click to select
  dropArea.addEventListener('click', () => {
    fileInput.click();
  });

  // File chosen
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectedFile(e.target.files[0]);
    }
  });

  // Drag and drop events
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropArea.style.borderColor = 'var(--primary)';
      dropArea.style.backgroundColor = '#F3E8FF';
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropArea.style.borderColor = 'var(--primary-light)';
      dropArea.style.backgroundColor = '#FAF5FF';
    });
  });

  dropArea.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  });

  // Remove photo
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearPhoto();
    });
  }

  function handleSelectedFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WEBP).', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('A imagem deve ter no máximo 10MB.', 'warning');
      return;
    }

    selectedPhotoFile = file;

    const reader = new FileReader();
    reader.onload = (event) => {
      previewImg.src = event.target.result;
      dropArea.style.display = 'none';
      previewWrap.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    selectedPhotoFile = null;
    fileInput.value = '';
    previewImg.src = '';
    previewWrap.style.display = 'none';
    dropArea.style.display = 'block';
  }
}

/**
 * Handle new item form submission
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('name');
  const categorySelect = document.getElementById('category_id');
  const locationInput = document.getElementById('location_found');
  const foundAtInput = document.getElementById('found_at');
  const descInput = document.getElementById('description');
  const submitBtn = document.getElementById('submitBtn');

  const name = nameInput.value.trim();
  const category_id = categorySelect.value;
  const location_found = locationInput.value.trim();
  const found_at = foundAtInput.value;
  const description = descInput ? descInput.value.trim() : '';

  // Validations
  if (!name) {
    showToast('Informe o nome do item.', 'warning');
    nameInput.focus();
    return;
  }

  if (!category_id) {
    showToast('Selecione uma categoria para o item.', 'warning');
    categorySelect.focus();
    return;
  }

  if (!location_found) {
    showToast('Informe onde o item foi encontrado.', 'warning');
    locationInput.focus();
    return;
  }

  if (!found_at) {
    showToast('Informe a data e o horário do achado.', 'warning');
    foundAtInput.focus();
    return;
  }

  // Build FormData for multipart POST
  const formData = new FormData();
  formData.append('name', name);
  formData.append('category_id', category_id);
  formData.append('location_found', location_found);
  formData.append('found_at', found_at);
  if (description) {
    formData.append('description', description);
  }
  if (selectedPhotoFile) {
    formData.append('photo', selectedPhotoFile);
  }

  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <div class="spinner spinner-sm"></div>
    <span>Publicando item...</span>
  `;

  try {
    const res = await apiRequest('/api/items', {
      method: 'POST',
      body: formData
    });

    showToast('Item registrado com sucesso!', 'success');
    setTimeout(() => {
      const createdItem = res.item || res;
      if (createdItem && createdItem.id) {
        window.location.href = `item-detail.html?id=${createdItem.id}`;
      } else {
        window.location.href = 'home.html';
      }
    }, 900);
  } catch (err) {
    showToast(err.message || 'Erro ao publicar item. Tente novamente.', 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}
