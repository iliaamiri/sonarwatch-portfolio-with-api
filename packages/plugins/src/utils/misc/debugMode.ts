export function isDebugMode(): boolean {
  return (process.env['PORTFOLIO_API_DEBUG'] ?? false) === 'true';
}
