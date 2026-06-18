const SaveText = () => {
  return (
    <div>
      {/* ✅ Added visual indicator for keyboard shortcut with dark theme support */}
      <div className="fixed bottom-4 right-4 text-xs 
                    text-gray-500 dark:text-gray-400 
                    bg-white dark:bg-[#1e1e1e] 
                    px-2 py-1 rounded shadow 
                    border border-gray-300 dark:border-gray-600
                    transition-colors">
        Press <kbd className="px-1 py-0.5 
                           bg-gray-100 dark:bg-[#242424] 
                           border border-gray-300 dark:border-gray-600
                           text-gray-900 dark:text-gray-100
                           rounded font-mono">Ctrl+S</kbd> to save
      </div>
    </div>
  )
}

export default SaveText