import { useState, useEffect } from "react";
import { supabase } from "../Hooks/supabase";

export default function ModalAgregarPedido({ idMesa, onClose }) {
  const [productos, setProductos] = useState([]);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [pedidoTemporal, setPedidoTemporal] = useState([]);
  const [loading, setLoading] = useState(false);

  // Traer productos activos
  useEffect(() => {
    const fetchProductos = async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("activo", true);
      if (error) console.error(error);
      else setProductos(data);
    };
    fetchProductos();
  }, []);

  // Agregar producto al pedido temporal
  const agregarAlPedidoTemporal = () => {
    if (!selectedProducto) return alert("Selecciona un producto");
    const producto = productos.find(p => p.id_producto === Number(selectedProducto));
    setPedidoTemporal(prev => {
      const existe = prev.find(p => p.id_producto === producto.id_producto);
      if (existe) {
        // sumar cantidades si ya está
        return prev.map(p => 
          p.id_producto === producto.id_producto
            ? { ...p, cantidad: p.cantidad + cantidad }
            : p
        );
      } else {
        return [...prev, { 
          id_producto: producto.id_producto, 
          nombre: producto.nombre, 
          cantidad, 
          precio_unitario: producto.precio 
        }];
      }
    });
    setSelectedProducto(null);
    setCantidad(1);
  };

  // Eliminar producto del pedido temporal
  const eliminarProductoTemporal = (id_producto) => {
    setPedidoTemporal(prev => prev.filter(p => p.id_producto !== id_producto));
  };

  // Confirmar pedido y actualizar stock
  const confirmarPedido = async () => {
    if (pedidoTemporal.length === 0) return alert("Agrega al menos un producto");
    setLoading(true);

    try {
      // 1️⃣ Verificar o crear pedido pendiente
      const { data: pedidoExistente } = await supabase
        .from("pedidos")
        .select("*")
        .eq("id_mesa", idMesa)
        .eq("estado", "pendiente")
        .maybeSingle();

      let idPedido;
      if (!pedidoExistente) {
        const { data: nuevoPedido, error: errorNuevo } = await supabase
          .from("pedidos")
          .insert([{ id_mesa: idMesa, id_usuario: 5104, total: 0 }])
          .select()
          .single();
        if (errorNuevo) throw errorNuevo;
        idPedido = nuevoPedido.id_pedido;
      } else {
        idPedido = pedidoExistente.id_pedido;
      }

      // 2️⃣ Insertar todos los productos
      const detalleInsert = pedidoTemporal.map(p => ({
        id_pedido: idPedido,
        id_producto: p.id_producto,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario
      }));

      const { error: errorDetalle } = await supabase
        .from("pedido_detalle")
        .insert(detalleInsert);
      if (errorDetalle) throw errorDetalle;

      // 3️⃣ Descontar stock_actual
      for (const p of pedidoTemporal) {
        const { data: prodData, error: errorProd } = await supabase
          .from("productos")
          .select("stock_actual")
          .eq("id_producto", p.id_producto)
          .single();
        if (errorProd) throw errorProd;

        const { error: errorStock } = await supabase
          .from("productos")
          .update({ stock_actual: prodData.stock_actual - p.cantidad })
          .eq("id_producto", p.id_producto);
        if (errorStock) throw errorStock;
      }

      alert("Pedido confirmado");
      setPedidoTemporal([]);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error confirmando pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h2 className="text-lg font-bold mb-4">Agregar productos a mesa {idMesa}</h2>

        {/* Selector de producto */}
        <select
          value={selectedProducto || ""}
          onChange={(e) => setSelectedProducto(e.target.value)}
          className="border p-2 w-full mb-3"
        >
          <option value="">Selecciona un producto</option>
          {productos.map(p => (
            <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
          ))}
        </select>

        <input
          type="number"
          min="1"
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
          className="border p-2 w-full mb-3"
        />

        <div className="flex justify-between mb-3">
          <button onClick={agregarAlPedidoTemporal} className="px-4 py-2 bg-green-500 text-white rounded">
            Agregar
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Cancelar</button>
        </div>

        {/* Lista de productos agregados */}
        {pedidoTemporal.length > 0 && (
          <div className="mb-3">
            <h3 className="font-bold mb-1">Productos agregados:</h3>
            <ul className="max-h-40 overflow-y-auto border p-2">
              {pedidoTemporal.map((p, idx) => (
                <li key={idx} className="flex justify-between">
                  {p.nombre} x {p.cantidad}
                  <button 
                    onClick={() => eliminarProductoTemporal(p.id_producto)}
                    className="text-red-500 ml-2"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={confirmarPedido}
          disabled={loading || pedidoTemporal.length === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded w-full"
        >
          {loading ? "Confirmando..." : "Confirmar pedido"}
        </button>
      </div>
    </div>
  );
}


