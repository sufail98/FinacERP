// import React, { useEffect } from "react";

// const MyForm = () => {
//   const handleSubmit = (e) => {
//     e.preventDefault(); // prevent page reload
//     alert("Form submitted!");
//     // your submit logic here
//   };

//   useEffect(() => {
//     const handleKeyDown = (e) => {
//       // Check for Ctrl+S or Cmd+S
//       if ((e.ctrlKey || e.metaKey) && e.key === "s") {
//         e.preventDefault(); // stop browser's save dialog
//         document.getElementById("myForm").requestSubmit(); // trigger form submit
//       }
//     };

//     window.addEventListener("keydown", handleKeyDown);

//     return () => {
//       window.removeEventListener("keydown", handleKeyDown);
//     };
//   }, []);

//   return (
//     <form id="myForm" onSubmit={handleSubmit}>
//       <input type="text" placeholder="Enter something" />
//       <button type="submit">Submit</button>
//     </form>
//   );
// };

// export default MyForm;


import  { useState, useEffect } from "react";

const Invoice = () => {
  const [rows, setRows] = useState([
    { id: 1, item: "Item A", price: 100 },
    { id: 2, item: "Item B", price: 200 },
  ]);
  const [deletedHistory, setDeletedHistory] = useState([]);

  const addRow = () => {
    setRows([
      ...rows,
      { id: Date.now(), item: `Item ${rows.length + 1}`, price: 0 },
    ]);
  };

  const deleteRow = (id) => {
    const rowToDelete = rows.find((r) => r.id === id);
    setDeletedHistory([...deletedHistory, rowToDelete]);
    setRows(rows.filter((r) => r.id !== id));
  };

  // Handle Ctrl+Z
  useEffect(() => {
    const handleUndo = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (deletedHistory.length > 0) {
          const lastDeleted = deletedHistory[deletedHistory.length - 1];
          setRows((prev) => [...prev, lastDeleted]);
          setDeletedHistory((prev) => prev.slice(0, -1));
        }
      }
    };

    window.addEventListener("keydown", handleUndo);
    return () => window.removeEventListener("keydown", handleUndo);
  }, [deletedHistory]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">🧾 Invoice</h2>

      <button
        onClick={addRow}
        className="mb-4 px-4 py-2 main-bg text-white rounded-lg shadow hover:bg-blue-700 transition"
      >
        ➕ Add Row
      </button>

      <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left text-gray-700">Item</th>
            <th className="px-4 py-2 text-left text-gray-700">Price</th>
            <th className="px-4 py-2 text-center text-gray-700">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-t hover:bg-gray-50 transition"
            >
              <td className="px-4 py-2">{row.item}</td>
              <td className="px-4 py-2">{row.price}</td>
              <td className="px-4 py-2 text-center">
                <button
                  onClick={() => deleteRow(row.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition"
                >
                  🗑 Delete
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan="3" className="text-center py-4 text-gray-500">
                No items in invoice
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="mt-4 text-gray-600">
        💡 Tip: Delete a row, then press <kbd className="px-1 py-0.5 bg-gray-200 rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-200 rounded">Z</kbd> to undo!
      </p>
    </div>
  );
};

export default Invoice;
