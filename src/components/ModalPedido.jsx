import { useState, useEffect } from "react";
import { supabase } from "../Hooks/supabase";

export default function ModalAgregarPedido({ idMesa, onClose }) {
  const [productos, setProductos] = useState([]);
  const [selectedProducto, setSelectedProducto] = useState(null); // ahora guarda {id_producto, tipo}
  const [cantidad, setCantidad] = useState(1);
  const [pedidoTemporal, setPedidoTemporal] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoriaAbierta, setCategoriaAbierta] = useState(null);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const { data: productosData, error: errorProd } = await supabase
          .from("productos")
          .select("*")
          .eq("activo", true);
        if (errorProd) throw errorProd;

        const { data: viernesData, error: errorViernes } = await supabase.from(
          "covers_viernes"
        ).select(`
            id_producto,
            precio_viernes,
            productos!inner(nombre, categoria)
          `);
        if (errorViernes) throw errorViernes;

        const { data: sabadoData, error: errorSabado } = await supabase.from(
          "covers_sabado"
        ).select(`
            id_producto,
            precio_sabado,
            productos!inner(nombre, categoria)
          `);
        if (errorSabado) throw errorSabado;

        const productosCombinados = [
          ...productosData.map((p) => ({
            ...p,
            tipo: "normal",
            precio: p.precio,
          })),
          ...viernesData.map((p) => ({
            id_producto: p.id_producto,
            nombre: p.productos.nombre,
            categoria: p.productos.categoria,
            tipo: "viernes",
            precio: p.precio_viernes,
          })),
          ...sabadoData.map((p) => ({
            id_producto: p.id_producto,
            nombre: p.productos.nombre,
            categoria: p.productos.categoria,
            tipo: "sabado",
            precio: p.precio_sabado,
          })),
        ];

        setProductos(productosCombinados);
      } catch (err) {
        console.error(err);
        alert("Error cargando productos");
      }
    };

    fetchProductos();
  }, []);

  const productosPorCategoria = productos.reduce((acc, p) => {
    const cat = p.categoria || "Sin categoría";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const agregarAlPedidoTemporal = () => {
    if (!selectedProducto) return alert("Selecciona un producto");

    const producto = productos.find(
      (p) =>
        p.id_producto === Number(selectedProducto.id_producto) &&
        p.tipo === selectedProducto.tipo
    );
    if (!producto) return alert("Producto no encontrado");

    setPedidoTemporal((prev) => {
      const existe = prev.find(
        (p) =>
          p.id_producto === producto.id_producto && p.tipo === producto.tipo
      );
      if (existe) {
        return prev.map((p) =>
          p.id_producto === producto.id_producto && p.tipo === producto.tipo
            ? { ...p, cantidad: p.cantidad + cantidad }
            : p
        );
      } else {
        return [
          ...prev,
          {
            id_producto: producto.id_producto,
            nombre: producto.nombre,
            cantidad,
            precio_unitario: producto.precio,
            tipo: producto.tipo,
          },
        ];
      }
    });

    setSelectedProducto(null);
    setCantidad(1);
  };

  const eliminarProductoTemporal = (id_producto, tipo) => {
    setPedidoTemporal((prev) =>
      prev.filter((p) => !(p.id_producto === id_producto && p.tipo === tipo))
    );
  };

  const confirmarPedido = async () => {
    if (pedidoTemporal.length === 0)
      return alert("Agrega al menos un producto");
    setLoading(true);

    try {
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

      const detalleInsert = pedidoTemporal.map((p) => ({
        id_pedido: idPedido,
        id_producto: p.id_producto,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario,
      }));

      const { error: errorDetalle } = await supabase
        .from("pedido_detalle")
        .insert(detalleInsert);
      if (errorDetalle) throw errorDetalle;

      for (const p of pedidoTemporal.filter((p) => p.tipo === "normal")) {
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
      <div className="bg-white p-6 rounded-lg w-auto">
        <h2 className="text-lg font-bold mb-4">
          Agregar productos a mesa {idMesa}
        </h2>

        {/* Categorías con modal */}
        <div className="mb-3 grid grid-cols-3 gap-x-8 w-full">
          {Object.entries(productosPorCategoria).map(([categoria]) => (
            <div key={categoria} className="mb-2 flex flex-col">
              <button
                onClick={() => setCategoriaAbierta(categoria)}
                className="w-full flex justify-between items-center bg-gray-200 px-3 py-2 rounded"
              >
                <span>{categoria}</span>
                <span>▶</span>
              </button>
            </div>
          ))}
        </div>

        {/* Modal productos por categoría */}
        {categoriaAbierta && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96">
              <h3 className="text-lg font-bold mb-3">{categoriaAbierta}</h3>

              <ul className="max-h-60 overflow-y-auto border rounded">
                {productosPorCategoria[categoriaAbierta].map((p) => (
                  <li
                    key={`${p.tipo}-${p.id_producto}`}
                    onClick={() =>
                      setSelectedProducto({
                        id_producto: p.id_producto,
                        tipo: p.tipo,
                      })
                    }
                    className={`px-3 py-2 cursor-pointer hover:bg-blue-100 ${
                      selectedProducto?.id_producto === p.id_producto &&
                      selectedProducto?.tipo === p.tipo
                        ? "bg-blue-200"
                        : ""
                    }`}
                  >
                    {p.nombre} — ${p.precio}{" "}
                    {p.tipo !== "normal" ? `(${p.tipo})` : ""}
                  </li>
                ))}
              </ul>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setCategoriaAbierta(null)}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input cantidad */}
        <div className="flex mb-3 justify-between ">
          <input
            type="number"
            min="1"
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            className="border p-2 "
          />

          <button
            onClick={agregarAlPedidoTemporal}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Agregar
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
            Cancelar
          </button>
        </div>

        {pedidoTemporal.length > 0 && (
          <div className="mb-3">
            <h3 className="font-bold mb-1">Productos agregados:</h3>
            <ul className="max-h-40 overflow-y-auto border p-2">
              {pedidoTemporal.map((p, idx) => (
                <li key={`${p.tipo}-${idx}`} className="flex justify-between">
                  {p.nombre} x {p.cantidad} — ${p.precio_unitario}
                  <button
                    onClick={() =>
                      eliminarProductoTemporal(p.id_producto, p.tipo)
                    }
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

