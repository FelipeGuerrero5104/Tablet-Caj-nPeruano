import { useState } from "react";
import Mesa from "./components/Mesas";
import ModalAgregarPedido from "./components/ModalPedido";

export default function App() {
  const [selectedMesa, setSelectedMesa] = useState(null);

  const primeraFila = [
    { id: 10, shape: "circle" },
    { id: 9, shape: "square" },
    { id: 8, shape: "square" },
    { id: 7, shape: "square" },
    { id: 6, shape: "square" },
    { id: 5, shape: "square" },
    { id: 4, shape: "square" },
    { id: 3, shape: "square" },
    { id: 2, shape: "square" },
    { id: 1, shape: "square" },
  ];

  const segundaFilaDer = [
    { id: 17, shape: "square" },
    { id: 18, shape: "circle" },
    { id: 19, shape: "circle" },
    { id: 20, shape: "square" },
  ];

  const handleMesaClick = (id) => setSelectedMesa(id);

  return (
    <section className="bg-amber-400 w-full h-screen flex items-center justify-center">
      <div className="bg-amber-200 flex flex-col gap-5 p-4 rounded-lg mb-24">
        {/* Fila superior */}
        <div className="flex gap-4">
          {primeraFila.map((mesa) => (
            <Mesa key={mesa.id} {...mesa} onClick={handleMesaClick} />
          ))}
        </div>

        {/* Segunda fila */}
        <div className="flex justify-between gap-5 mt-5">
          <div className="flex gap-5">
            <Mesa id={11} w="w-14" h="h-48" onClick={handleMesaClick} />
            <div className="flex flex-col justify-between">
              <Mesa id={12} w="w-40" h="h-14" onClick={handleMesaClick} />
              <Mesa id={13} w="w-40" h="h-14" onClick={handleMesaClick} />
            </div>
            <div className="flex flex-col gap-5">
              <Mesa id={14} onClick={handleMesaClick} />
              <Mesa id={15} onClick={handleMesaClick} />
              <Mesa id={16} onClick={handleMesaClick} />
            </div>
          </div>

          {/* Derecha */}
          <div className="grid grid-cols-2 gap-5">
            {segundaFilaDer.map((mesa) => (
              <Mesa key={mesa.id} {...mesa} onClick={handleMesaClick} />
            ))}
          </div>
        </div>
      </div>

      {/* Modal de pedido */}
      {selectedMesa && (
        <ModalAgregarPedido
          idMesa={selectedMesa}
          onClose={() => setSelectedMesa(null)}
        />
      )}
    </section>
  );
}



