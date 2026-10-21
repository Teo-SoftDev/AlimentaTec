// src/hooks/useCollection.js — Suscripción en tiempo real a una colección.
// Si la colección está vacía (o falla) y se entrega `fallback`, se muestran
// datos de demostración marcados con `_demo: true`.
import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase.js";
import { friendlyError } from "../utils/errors.js";

export const toDate = (v) => {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function useCollection(name, { orderByField, direction = "asc", limitN = 200, whereClauses = [], fallback = null, enabled = true } = {}) {
  const [state, setState] = useState({ items: [], loading: true, error: null });
  const key = JSON.stringify([name, orderByField, direction, limitN, whereClauses, enabled]);

  useEffect(() => {
    if (!enabled) {
      setState({ items: [], loading: false, error: null });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true }));
    const constraints = [
      ...whereClauses.map(([f, op, v]) => where(f, op, v)), // valores ya validados por Zod
      ...(orderByField ? [orderBy(orderByField, direction)] : []),
      limit(limitN),
    ];
    const unsub = onSnapshot(
      query(collection(db, name), ...constraints),
      (snap) => setState({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })), loading: false, error: null }),
      (err) => setState({ items: [], loading: false, error: friendlyError(err, "No se pudieron cargar los datos. Reintente en unos minutos.") })
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return useMemo(() => {
    const isDemo = !state.loading && state.items.length === 0 && Array.isArray(fallback);
    return {
      items: isDemo ? fallback.map((x) => ({ ...x, _demo: true })) : state.items,
      loading: state.loading,
      error: state.error,
      isDemo,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, fallback]);
}
