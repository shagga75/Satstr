# Satstr — Contexto del proyecto

Fork de Shopstr (https://github.com/shopstr-eng/shopstr) convertido en Fedi Mini App marketplace descentralizado.

## Stack

- Next.js (Pages Router), TypeScript, Tailwind CSS, NextUI
- nostr-tools, cashu-ts, Alby js-lightning-tools
- NIP-07 (auth), NIP-17 (DMs cifrados), NIP-46 (firma remota), NIP-47 (Wallet Connect / WebLN), NIP-99 (Classified Listings)

## Reglas de desarrollo

- Nunca romper compatibilidad con NIP-99
- Mantener soporte Cashu completo
- Licencia GPL-3.0 — mantener headers de licencia
- Toda config de plataforma va en variables de entorno
- Código comentado en inglés, commits en inglés (conventional commits)
- Antes de modificar un archivo, leerlo completo primero

## Variables de entorno clave (agregar a .env.local y .env.example)

- NEXT_PUBLIC_PLATFORM_FEE_PUBKEY — pubkey hex del operador para recibir fees
- NEXT_PUBLIC_PLATFORM_FEE_PERCENT — porcentaje del fee (default: 3)
- NEXT_PUBLIC_MARKETPLACE_NAME — nombre del marketplace (default: Satstr)
- NEXT_PUBLIC_DEFAULT_RELAYS — relays separados por coma
- NEXT_PUBLIC_ADMIN_PUBKEY — pubkey hex del admin para moderación

## Fases de desarrollo

### Fase 1 (MVP mejorado) — EN PROGRESO

1. Renombrado Shopstr → Satstr + variables de entorno
2. Fee splitting 3%: Cashu (dividir token) y Lightning (WebLN doble pago o segundo invoice)
3. Detección de contexto Fedi + optimización WebView
4. Sistema de moderación ligero (reportes + bans via Nostr)
5. Flujo de órdenes mejorado (estados, timeline, notificaciones)
6. Soporte mejorado productos físicos (shipping, dirección cifrada)

### Fase 2

- Roles Nostr (Admin / Moderador / Vendedor verificado)
- Categorías y colecciones personalizables
- Optimización avanzada Fedi Mini App

## Notas importantes sobre fee splitting

- Cashu: usar wallet.send() dos veces — 97% vendedor, 3% fee pubkey
- Lightning con WebLN: webln.sendPayment() dos veces
- Lightning sin WebLN: mostrar segundo invoice/QR del 3%
- Si NEXT_PUBLIC_PLATFORM_FEE_PUBKEY no está configurado: omitir fee con console.warn
