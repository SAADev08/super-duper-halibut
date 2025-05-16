export function truncateMiddle(text: string, startLength = 8, endLength = 8) {
    if (text.length <= startLength + endLength) return text;
    return `${text.slice(0, startLength)}...${text.slice(-endLength)}`;
  }