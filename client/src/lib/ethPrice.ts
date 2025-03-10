import { useQuery } from "@tanstack/react-query";

// Standard ETH price fallback value to be used consistently across the app
export const ETH_PRICE_FALLBACK = 2500;

/**
 * Fetches current ETH price from CoinGecko API with proper error handling
 * @returns ETH price in USD or fallback value on error
 */
export const fetchEthPrice = async (): Promise<number> => {
  try {
    // Add cache control headers to avoid stale responses
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', 
      {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(5000)
      }
    );
    
    if (!response.ok) {
      console.warn(`ETH price API returned ${response.status} status, using fallback price`);
      return ETH_PRICE_FALLBACK;
    }
    
    const data = await response.json();
    
    if (data?.ethereum?.usd) {
      return data.ethereum.usd;
    } else {
      console.warn('ETH price data format unexpected:', data);
      return ETH_PRICE_FALLBACK;
    }
  } catch (error) {
    console.error('Error fetching ETH price:', error);
    return ETH_PRICE_FALLBACK;
  }
};

/**
 * React Query hook for fetching ETH price with caching
 * @returns ETH price data and query status
 */
export const useEthPrice = () => {
  return useQuery({
    queryKey: ['ethPrice'],
    queryFn: fetchEthPrice,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
};