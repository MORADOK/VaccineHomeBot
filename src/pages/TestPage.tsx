import React from 'react';

const TestPage = () => {
  console.log('TestPage component loaded');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">🏥</div>
        <h1 className="text-3xl font-bold text-teal-600 mb-2">
          ทดสอบระบบ
        </h1>
        <h2 className="text-xl text-gray-600 mb-4">
          VCHome Hospital
        </h2>
        <p className="text-gray-500 mb-6">
          หน้าทดสอบ React Component
        </p>
        
        <div className="space-y-3">
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm">
            ✅ React Component ทำงานได้
          </div>
          <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm">
            ✅ Tailwind CSS ทำงานได้
          </div>
          <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm">
            ✅ TypeScript ทำงานได้
          </div>
        </div>
        
        <button 
          className="mt-6 bg-teal-600 text-white px-6 py-3 rounded-xl hover:bg-teal-700 transition-colors"
          onClick={() => {
            console.log('Button clicked successfully');
            alert('ระบบทำงานได้ปกติ!');
          }}
        >
          ทดสอบการทำงาน
        </button>
      </div>
    </div>
  );
};

export default TestPage;