function App() {
  return (
    <>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded shadow-md text-center">
          <h1 className="text-3xl font-bold text-blue-600 mb-4">
            Tailwind CSS is Working!
          </h1>
          <p className="text-gray-700">
            If you can see this styled box with colored text, rounded corners,
            and a shadow, Tailwind is set up correctly.
          </p>
          <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
            Test Button
          </button>
        </div>
      </div>
    </>
  );
}

export default App;
