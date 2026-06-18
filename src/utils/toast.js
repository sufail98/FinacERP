import toast from 'react-hot-toast';

export const showToast = {
  success: (message) => {
    toast.success(message, {
      duration: 2000,
      position: 'bottom-center',
      style: {
        background: '#216633',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
      },
    });
  },

  error: (message) => {
    toast.error(message, {
      duration: 2000,
      position: 'bottom-center',
      style: {
        background: '#EF4444',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
      },
    });
  },

  warning: (message) => {
    toast(message, {
      duration: 2000,
      position: 'bottom-center',
      icon: '⚠️',
      style: {
        background: '#F59E0B',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
      },
    });
  },

  info: (message) => {
    toast(message, {
      duration: 2000,
      position: 'bottom-center',
      icon: 'ℹ️',
      style: {
        background: '#3B82F6',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
      },
    });
  },

  loading: (message) => {
    return toast.loading(message, {
      position: 'bottom-center',
    });
  },

  dismiss: (toastId) => {
    toast.dismiss(toastId);
  },
};