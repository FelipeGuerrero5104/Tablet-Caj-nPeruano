// usePedidos.js
import { useState } from "react";
import { supabase } from "./supabase";

export const usePedidos = () => {
  const [loading, setLoading] = useState(false);
  const [pedidoTemporal, setPedidoTemporal] = useState([]); // productos agregados temporalmente

  // Agregar producto al pedido temporal
  const agregarProductoTemporal = ({ id_producto, cantidad, precio_unitario }) => {
    setPedidoTemporal(prev => {
      // si el producto ya está, sumamos la cantidad
      const existe = prev.find(p => p.id_producto === id_producto);
      if (existe) {
        return prev.map(p =>
          p.id_producto === id_producto
            ? { ...p, cantidad: p.cantidad + cantidad }
            : p
        );
      } else {
        return [...prev, { id_producto, cantidad, precio_unitario }];
      }
    });
  };

  // Eliminar producto del pedido temporal
  const eliminarProductoTemporal = (id_producto) => {
    setPedidoTemporal(prev => prev.filter(p => p.id_producto !== id_producto));
  };

  // Confirmar pedido y guardar en base de datos
  const confirmarPedido = async ({ idMesa, idUsuario }) => {
    if (pedidoTemporal.length === 0) return false;
    setLoading(true);

    try {
      // 1️⃣ Verificar si hay pedido pendiente
      const { data: pedidoExistente } = await supabase
        .from("pedidos")
        .select("*")
        .eq("id_mesa", Number(idMesa))
        .eq("estado", "pendiente")
        .maybeSingle();

      let idPedido;
      if (!pedidoExistente) {
        // Crear nuevo pedido
        const { data: nuevoPedido, error: errorNuevo } = await supabase
          .from("pedidos")
          .insert([{ id_mesa: Number(idMesa), id_usuario: idUsuario, total: 0 }])
          .select()
          .single();
        if (errorNuevo) throw errorNuevo;
        idPedido = nuevoPedido.id_pedido;
      } else {
        idPedido = pedidoExistente.id_pedido;
      }

      // 2️⃣ Insertar detalle del pedido
      const detalleInsert = pedidoTemporal.map(p => ({
        id_pedido: idPedido,
        id_producto: p.id_producto,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario,
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

      // 4️⃣ Limpiar pedido temporal
      setPedidoTemporal([]);
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Error confirmando pedido:", err);
      setLoading(false);
      return false;
    }
  };

  return {
    pedidoTemporal,
    agregarProductoTemporal,
    eliminarProductoTemporal,
    confirmarPedido,
    loading
  };
};



