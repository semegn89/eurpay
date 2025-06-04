document.addEventListener('DOMContentLoaded', function () {
  const registerForm = document.getElementById('registerForm');
  const bar = document.getElementById('registerProgressBarInner');
  const text = document.getElementById('registerProgressText');
  if (!registerForm || !bar || !text) return;

  function updateProgressBar() {
    const fields = Array.from(registerForm.querySelectorAll('input[required], input[type="checkbox"][required]'));
    const filled = fields.filter(input =>
      (input.type === 'checkbox' ? input.checked : !!input.value.trim())
    ).length;
    const percent = Math.round((filled / fields.length) * 100);
    bar.style.width = percent + "%";
    text.textContent = `Заполнено: ${percent}%`;
  }

  registerForm.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', updateProgressBar);
    input.addEventListener('change', updateProgressBar);
  });

  updateProgressBar();
});