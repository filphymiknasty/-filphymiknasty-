import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Simple text encoder/decoder
export const encodeText = (text: string) => new TextEncoder().encode(text);
export const decodeText = (buffer: ArrayBuffer) => new TextDecoder().decode(buffer);

// AES-GCM Encryption using Web Crypto API
export async function generateKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encodeText(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(text: string, password: string): Promise<string> {
  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await generateKeyFromPassword(password, salt);
    
    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encodeText(text)
    );
    
    // Combine salt, iv, and ciphertext into a single base64 string
    const encryptedBytes = new Uint8Array(encryptedContent);
    const combined = new Uint8Array(salt.length + iv.length + encryptedBytes.length);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(encryptedBytes, salt.length + iv.length);
    
    return btoa(String.fromCharCode.apply(null, Array.from(combined)));
  } catch (e) {
    console.error("Encryption failed", e);
    return text; // fallback
  }
}

export async function decryptText(encryptedBase64: string, password: string): Promise<string> {
  try {
    const combined = new Uint8Array(atob(encryptedBase64).split("").map(c => c.charCodeAt(0)));
    
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encryptedBytes = combined.slice(28);
    
    const key = await generateKeyFromPassword(password, salt);
    
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encryptedBytes
    );
    
    return decodeText(decryptedContent);
  } catch (e) {
    // console.error("Decryption failed", e);
    return encryptedBase64; // Return as-is if it's not encrypted or decryption fails
  }
}
