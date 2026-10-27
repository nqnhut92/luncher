// Keep notifications outside #app so they never rebuild forms or move the page.
const toast = document.createElement('div');
toast.className = 'toast';
toast.hidden = true;
toast.innerHTML = '<span class="toast-icon" aria-hidden="true"></span><span class="toast-message" role="status" aria-live="polite" aria-atomic="true"></span><button type="button" class="toast-close" aria-label="Đóng thông báo">×</button>';
document.body.append(toast);
let dismissTimer;
export function dismissToast() {
  clearTimeout(dismissTimer);
  toast.hidden = true;
  toast.querySelector('.toast-message').textContent = '';
}
toast.querySelector('.toast-close').addEventListener('click', dismissToast);
export function showToast(message, type = 'info') {
  clearTimeout(dismissTimer);
  toast.dataset.type = type;
  toast.querySelector('.toast-icon').textContent = type === 'success' ? '✓' : type === 'error' ? '!' : 'i';
  toast.hidden = false;
  toast.querySelector('.toast-message').textContent = message;
  dismissTimer = setTimeout(dismissToast, 3000);
}
