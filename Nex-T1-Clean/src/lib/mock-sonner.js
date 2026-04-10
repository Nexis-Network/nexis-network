// Mock sonner library for server-side rendering
// This prevents DOM manipulation errors during SSR

const mockToast = () => {
  // Return a mock toast function that does nothing
  return () => {};
};

const mockToaster = () => {
  // Return null for server-side rendering
  return null;
};

// Export the same API as sonner
export const toast = mockToast;

export const Toaster = mockToaster;

// Export default as well
const sonnerMock = {
  toast: mockToast,
  Toaster: mockToaster,
};

export default sonnerMock;

// Also provide the toast methods that are commonly used
toast.success = mockToast;
toast.error = mockToast;
toast.warning = mockToast;
toast.info = mockToast;
toast.loading = mockToast;
toast.dismiss = mockToast;
toast.promise = mockToast;
