export function getCoinMarketCapLogoUrl(id: number, size = 64) {
  return `https://s2.coinmarketcap.com/static/img/coins/${size}x${size}/${id}.png`;
}
