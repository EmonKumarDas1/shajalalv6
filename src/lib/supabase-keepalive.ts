import { supabase } from "../../supabase/supabase";

let keepAliveInterval: number | null = null;

/**
 * Starts a keep-alive mechanism for Supabase connection
 * Sends a lightweight query at regular intervals to prevent connection timeouts
 * @param intervalMs Time in milliseconds between keep-alive pings (default: 5 minutes)
 * @returns A cleanup function that stops the keep-alive mechanism
 */
export function startSupabaseKeepAlive(intervalMs = 5 * 60 * 1000) {
  // Clear any existing interval
  if (keepAliveInterval) {
    stopSupabaseKeepAlive();
  }

  // Send an initial ping immediately
  sendKeepAlivePing();

  // Set up the new interval
  keepAliveInterval = window.setInterval(sendKeepAlivePing, intervalMs);

  // Return a cleanup function
  return () => stopSupabaseKeepAlive();
}

/**
 * Sends a single keep-alive ping to Supabase
 */
async function sendKeepAlivePing() {
  try {
    // Execute a very lightweight query to keep the connection alive
    // Using a system table with minimal data transfer
    const { error } = await supabase.rpc("get_session");
    if (!error) {
      console.debug("Supabase keep-alive ping sent successfully");
    } else {
      console.warn("Supabase keep-alive ping failed, but continuing", error);
    }
  } catch (error) {
    console.error("Supabase keep-alive error:", error);
  }
}

/**
 * Stops the Supabase keep-alive mechanism
 */
export function stopSupabaseKeepAlive() {
  if (keepAliveInterval) {
    window.clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    console.debug("Supabase keep-alive mechanism stopped");
  }
}
