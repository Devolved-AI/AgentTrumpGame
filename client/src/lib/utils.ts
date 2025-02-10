import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Cache ETH price for 1 minute to avoid API rate limits
let cachedPrice: { value: number; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 1 minute in milliseconds

// Fetch current ETH price in USD from CoinGecko API
export async function getEthPriceUSD(): Promise<number> {
  // Return cached price if available and not expired
  if (cachedPrice && Date.now() - cachedPrice.timestamp < CACHE_DURATION) {
    return cachedPrice.value;
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
    );

    if (!response.ok) {
      throw new Error('Failed to fetch ETH price');
    }

    const data = await response.json();
    const price = data.ethereum.usd;

    // Cache the new price
    cachedPrice = {
      value: price,
      timestamp: Date.now()
    };

    return price;
  } catch (error) {
    console.error('Failed to fetch ETH price:', error);
    // Return last cached price if available, otherwise return a fallback value
    return cachedPrice?.value ?? 2500; // Fallback to approximate ETH price
  }
}

// Format ETH amount with proper decimals
export function formatEth(amount: string): string {
  const num = parseFloat(amount);
  return num.toFixed(4);
}

// Format USD amount with proper comma separation
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
}