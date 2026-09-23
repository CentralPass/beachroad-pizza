"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { acquireSocket, releaseSocket } from "./socket";
import type { MenuResponse } from "./types";

type Options = {
  initial?: MenuResponse | null;
  channel?: "online" | "table";
  // Called when an item sells out, so the page can clean the cart and say so.
  onSoldOut?: (itemId: number, name: string) => void;
  onAvailable?: (name: string) => void;
};

/**
 * The live menu: fetched on mount (replacing any server-rendered copy),
 * updated in real time when staff mark items sold out or back, and refetched
 * on socket reconnect and when the tab comes back, because socket events are
 * hints rather than a durable queue.
 */
export function useLiveMenu({ initial = null, channel = "online", onSoldOut, onAvailable }: Options = {}) {
  const [menu, setMenu] = useState<MenuResponse | null>(initial);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const [fading, setFading] = useState<Set<number>>(new Set());
  const callbacks = useRef({ onSoldOut, onAvailable });
  useEffect(() => {
    callbacks.current = { onSoldOut, onAvailable };
  });

  const path = channel === "table" ? "/api/menu?channel=table" : "/api/menu";

  const load = useCallback(async () => {
    try {
      const next = await api.get<MenuResponse>(path);
      setMenu(next);
      setError(null);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  useEffect(() => {
    const socket = acquireSocket();
    if (!socket) return;
    const onEvent = ({ item_id, name, sold_out }: { item_id: number; name?: string; sold_out?: boolean }) => {
      if (sold_out === false) {
        void load().then(() => {
          if (name) callbacks.current.onAvailable?.(name);
        });
        return;
      }
      setFading((current) => new Set([...current, item_id]));
      callbacks.current.onSoldOut?.(item_id, name || "An item");
      window.setTimeout(() => {
        setMenu((current) => current && {
          ...current,
          categories: current.categories.map((category) => ({
            ...category,
            items: category.items.filter((item) => item.id !== item_id),
          })).filter((category) => category.items.length > 0),
        });
        setFading((current) => {
          const next = new Set(current);
          next.delete(item_id);
          return next;
        });
      }, 600);
    };
    const onReconnect = () => void load();
    socket.on("item_sold_out", onEvent);
    socket.io.on("reconnect", onReconnect);
    return () => {
      socket.off("item_sold_out", onEvent);
      socket.io.off("reconnect", onReconnect);
      releaseSocket();
    };
  }, [load]);

  return { menu, loading, error, fading, reload: load };
}
