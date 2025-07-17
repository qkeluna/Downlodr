interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
}

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  message,
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-darkModeDropdown rounded-lg border border-darkModeCompliment p-6 max-w-sm w-full mx-4">
        <p className="text-gray-800 dark:text-gray-200 mb-4">{message}</p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-darkModeHover rounded"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 hover:bg-black hover:text-white"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
