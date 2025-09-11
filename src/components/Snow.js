import React, { useMemo } from 'react';

function Snowflakes() {
  // Tạo danh sách bông tuyết cố định với useMemo
  const snowflakes = useMemo(() => {
    return [...Array(20)].map((_, index) => ({
      id: index,
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 5}s`,
    }));
  }, []); // Mảng phụ thuộc rỗng: chỉ chạy một lần khi mount

  return snowflakes.map((flake) => (
    <div
      key={flake.id}
      className="snowflake"
      style={{
        left: flake.left,
        animationDelay: flake.animationDelay,
      }}
    />
  ));
}

export default Snowflakes;