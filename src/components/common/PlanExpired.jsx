import React from 'react';

const PlanExpired = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-gray-50 text-center p-5 z-[99999999999999999999]">
      <div className="bg-white px-10 py-10 rounded-xl shadow-lg max-w-md w-full">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-rose-600 text-2xl md:text-3xl font-bold mb-3">
          Your Plan Expired!
        </h1>
        <p className="text-gray-600 text-base leading-relaxed">
          Please contact software team to continue.
        </p>
      </div>
    </div>
  );
};

export default PlanExpired;