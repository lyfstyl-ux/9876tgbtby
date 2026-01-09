import { useState, useEffect } from "react";

export function MiniAppReady() {
  useEffect(() => {
    // Notify the parent frame (Base/Farcaster) that the app is ready
    if (typeof window !== "undefined") {
      // Delay signal to ensure everything is actually rendered
      const timer = setTimeout(() => {
        // Try multiple ways to signal readiness as different versions use different methods
        window.parent.postMessage({ type: "ready" }, "*");
        
        // Some versions of Farcaster Frames v2 use this specific structure
        window.parent.postMessage({ 
          type: "frame_event", 
          event: "ready" 
        }, "*");

        // Base app sometimes listens for a custom event
        const readyEvent = new CustomEvent("mini-app-ready");
        window.dispatchEvent(readyEvent);

        console.log("Mini App Ready signal sent (Multiple Methods with Delay)");
      }, 500); // 500ms delay

      return () => clearTimeout(timer);
    }
  }, []);

  return null;
}
