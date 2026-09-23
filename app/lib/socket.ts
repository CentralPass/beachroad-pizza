"use client";

import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";

// One shared connection for the tab. Events are hints for a fast UI; every
// consumer also refetches on reconnect because a socket is not a durable queue.
let socket: Socket | null = null;
let users = 0;

export function acquireSocket(): Socket | null {
  if (!API_URL || typeof window === "undefined") return null;
  if (!socket) socket = io(API_URL, { autoConnect: false, transports: ["websocket", "polling"] });
  users += 1;
  if (!socket.connected) socket.connect();
  return socket;
}

export function releaseSocket() {
  users = Math.max(0, users - 1);
  if (users === 0 && socket?.connected) socket.disconnect();
}
