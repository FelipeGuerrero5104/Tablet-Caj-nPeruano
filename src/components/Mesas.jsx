export default function Mesa({ id, shape = "square", w = "w-14", h = "h-16", onClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick(id);
      }}
      className={`bg-gray-500 ${w} ${h} flex items-center justify-center text-white font-bold cursor-pointer hover:bg-gray-700 ${
        shape === "circle" ? "rounded-full" : "rounded-xl"
      }`}
    >
      <p>{id}</p>
    </div>
  );
}
